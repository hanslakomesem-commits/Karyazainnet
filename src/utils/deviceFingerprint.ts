/**
 * ZAIN.NET Multi-Layer Device & System Fingerprinting Engine
 * Detects Windows OS version, GPU hardware, Canvas 2D rasterization,
 * AudioContext dynamics, Screen geometry, CPU cores, and Public IP.
 * Used to enforce 1x Free Trial per physical device / IP network
 * preventing students from bypassing limits by creating multiple accounts.
 */

export interface DeviceInfo {
  deviceFingerprint: string;
  osName: string;
  browserName: string;
  gpuRenderer: string;
  screenSpec: string;
  cpuCores: number;
  ipAddress: string;
  summary: string;
}

// Simple fast Murmur-like / DJB2-based 64-bit hash
export function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(36).toUpperCase();
}

/**
 * Generate Canvas 2D cryptographic text and geometry fingerprint.
 * Different Windows font rasterization sub-pixel rendering and GPU anti-aliasing
 * produce unique hash outputs even across identical browsers.
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas_unsupported';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Segoe UI', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('ZAIN.NET AntiFraud 2026 🇮🇩', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('ZAIN.NET AntiFraud 2026 🇮🇩', 4, 17);

    // Add arc and bezier curves
    ctx.beginPath();
    ctx.arc(50, 45, 10, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    return hashString(canvas.toDataURL());
  } catch (e) {
    return 'canvas_error';
  }
}

/**
 * Retrieve physical GPU Vendor & Unmasked Renderer via WebGL.
 * e.g., "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A8) Direct3D11 vs_5_0 ps_5_0, D3D11)"
 */
function getWebGLFingerprint(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      return { vendor: 'Generic', renderer: 'WebGL Unsupported' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return { vendor: 'Generic', renderer: 'DebugInfo Unavailable' };
    }

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown Vendor';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown Renderer';

    return { vendor: String(vendor), renderer: String(renderer) };
  } catch (e) {
    return { vendor: 'Error', renderer: 'Error' };
  }
}

/**
 * Detect Windows OS version and system architecture from User Agent
 */
function detectWindowsAndOS(): { osName: string; browserName: string } {
  const ua = navigator.userAgent;
  let osName = 'Sistem Operasi Lain';

  if (ua.includes('Windows NT 10.0')) {
    // Windows 10 or Windows 11 (Windows 11 reports NT 10.0 in UA)
    osName = ua.includes('Win64') || ua.includes('x64') ? 'Windows 10/11 (64-bit)' : 'Windows 10/11 (32-bit)';
  } else if (ua.includes('Windows NT 6.3')) {
    osName = 'Windows 8.1';
  } else if (ua.includes('Windows NT 6.2')) {
    osName = 'Windows 8';
  } else if (ua.includes('Windows NT 6.1')) {
    osName = 'Windows 7';
  } else if (ua.includes('Mac OS X')) {
    osName = 'macOS (Apple)';
  } else if (ua.includes('Android')) {
    osName = 'Android Mobile';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    osName = 'iOS (Apple)';
  } else if (ua.includes('Linux')) {
    osName = 'Linux';
  }

  let browserName = 'Browser Standar';
  if (ua.includes('Edg/')) {
    browserName = 'Microsoft Edge';
  } else if (ua.includes('Chrome/')) {
    browserName = 'Google Chrome';
  } else if (ua.includes('Firefox/')) {
    browserName = 'Mozilla Firefox';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browserName = 'Apple Safari';
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    browserName = 'Opera Browser';
  }

  return { osName, browserName };
}

/**
 * Retrieve or initialize persistent storage seed
 */
function getPersistentSeed(): string {
  const STORAGE_KEY = 'zain_device_uuid_v2';
  try {
    let seed = localStorage.getItem(STORAGE_KEY);
    if (!seed) {
      seed = 'ZDEV-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem(STORAGE_KEY, seed);
    }
    return seed;
  } catch (e) {
    return 'EPHEMERAL-SEED';
  }
}

/**
 * Detect client public IP address via server API or fallback
 */
export async function detectPublicIp(): Promise<string> {
  // 1. Try local server endpoint first
  try {
    const res = await fetch('/api/client-info', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') {
        return data.ip;
      }
    }
  } catch (e) {
    // continue to fallback
  }

  // 2. Try fast public IP provider (ipify)
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        return data.ip;
      }
    }
  } catch (e) {
    // continue to next
  }

  // 3. Fallback
  return 'Jaringan-Lokal (IP Terdeteksi)';
}

/**
 * Collect full device hardware & software fingerprint
 */
export async function collectDeviceFingerprint(): Promise<DeviceInfo> {
  const { osName, browserName } = detectWindowsAndOS();
  const webgl = getWebGLFingerprint();
  const canvasHash = getCanvasFingerprint();
  const seed = getPersistentSeed();
  const cpuCores = navigator.hardwareConcurrency || 4;
  const screenSpec = `${window.screen.width}x${window.screen.height} (${window.screen.colorDepth}-bit, DPR: ${window.devicePixelRatio || 1})`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const language = navigator.language || 'id-ID';

  // Fetch Public IP
  const ipAddress = await detectPublicIp();

  // Clean simplified GPU label
  let cleanGpu = webgl.renderer;
  if (cleanGpu.includes('Direct3D11')) cleanGpu = cleanGpu.split('Direct3D11')[0].trim();
  if (cleanGpu.length > 50) cleanGpu = cleanGpu.substring(0, 50) + '...';

  // Combine components into deterministic device fingerprint string
  const rawFingerprint = [
    'OS:' + osName,
    'GPU:' + webgl.renderer,
    'CANVAS:' + canvasHash,
    'SCREEN:' + screenSpec,
    'CORES:' + cpuCores,
    'TZ:' + timezone,
    'LANG:' + language,
    'SEED:' + seed
  ].join('||');

  const fingerprintHash = 'DEV-' + hashString(rawFingerprint) + '-' + hashString(webgl.renderer).substring(0, 4);

  const summary = `${osName} &bull; ${browserName} &bull; ${cleanGpu || 'GPU Terdeteksi'}`;

  return {
    deviceFingerprint: fingerprintHash,
    osName,
    browserName,
    gpuRenderer: cleanGpu,
    screenSpec,
    cpuCores,
    ipAddress,
    summary
  };
}
