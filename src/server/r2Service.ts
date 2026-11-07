import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 Credentials & Configuration
// These can be supplied via environment variables or loaded at runtime
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain?: string; // e.g. https://pub-xxxx.r2.dev or custom domain
}

let r2Client: S3Client | null = null;
let currentR2Config: R2Config | null = null;

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (accountId && accessKeyId && secretAccessKey && bucketName) {
    return {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicDomain: publicDomain || ''
    };
  }
  return currentR2Config;
}

export function setRuntimeR2Config(cfg: R2Config | null): void {
  currentR2Config = cfg;
  r2Client = null; // reset client to re-initialize
}

export function isR2Configured(): boolean {
  const cfg = getR2Config();
  return !!(cfg?.accountId && cfg?.accessKeyId && cfg?.secretAccessKey && cfg?.bucketName);
}

export function getR2Client(): S3Client | null {
  const cfg = getR2Config();
  if (!cfg) return null;

  if (!r2Client) {
    try {
      r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey
        }
      });
    } catch (err) {
      console.warn('Failed to initialize Cloudflare R2 client:', err);
      return null;
    }
  }
  return r2Client;
}

/**
 * Upload a binary buffer to Cloudflare R2
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  mimeType: string = 'application/octet-stream'
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  const cfg = getR2Config();
  const client = getR2Client();

  if (!cfg || !client) {
    return { success: false, url: '', key, error: 'Cloudflare R2 is not configured' };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    });

    await client.send(command);

    let url = '';
    if (cfg.publicDomain) {
      const base = cfg.publicDomain.replace(/\/+$/, '');
      url = `${base}/${encodeURIComponent(key)}`;
    } else {
      url = `/api/r2/download/${encodeURIComponent(key)}`;
    }

    return { success: true, url, key };
  } catch (err: any) {
    console.error(`Error uploading ${key} to Cloudflare R2:`, err);
    return { success: false, url: '', key, error: err?.message || 'R2 upload failed' };
  }
}

/**
 * Get an object stream/buffer from Cloudflare R2
 */
export async function getFromR2(key: string): Promise<Buffer | null> {
  const cfg = getR2Config();
  const client = getR2Client();

  if (!cfg || !client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: key
    });

    const response = await client.send(command);
    if (!response.Body) return null;

    // Convert readable stream to Buffer
    const chunks: Uint8Array[] = [];
    // @ts-ignore
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    console.warn(`Object ${key} not found in Cloudflare R2 or error:`, err);
    return null;
  }
}

/**
 * Delete an object from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const cfg = getR2Config();
  const client = getR2Client();

  if (!cfg || !client) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: cfg.bucketName,
      Key: key
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.warn(`Error deleting ${key} from Cloudflare R2:`, err);
    return false;
  }
}
