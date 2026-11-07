import { MakalahPost } from '../types';

const DB_NAME = 'zain_makalah_repository_v2';
const DB_VERSION = 1;
const STORE_POSTS = 'makalah_posts';
const STORE_FILES = 'makalah_files';

export interface StoredFileRecord {
  id: string; // fileId or postId
  fileName: string;
  dataUrl: string;
  fileSize: number;
  mimeType: string;
  updatedAt: number;
}

/**
 * Initialize IndexedDB database connection with robust version handling
 */
function openMakalahDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB tidak didukung pada lingkungan ini'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_POSTS)) {
        db.createObjectStore(STORE_POSTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Gagal membuka IndexedDB'));
    };
  });
}

/**
 * Save a single MakalahPost into persistent IndexedDB storage
 */
export async function savePostToIndexedDb(post: MakalahPost): Promise<void> {
  try {
    const db = await openMakalahDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_POSTS, STORE_FILES], 'readwrite');
      const postStore = transaction.objectStore(STORE_POSTS);
      const fileStore = transaction.objectStore(STORE_FILES);

      // Save post record
      postStore.put(post);

      // If post has original binary file dataUrl, also save into dedicated file store
      if (post.originalFileDataUrl && post.originalFileDataUrl.startsWith('data:')) {
        const fileRecord: StoredFileRecord = {
          id: post.fileId || post.id,
          fileName: post.originalFileName || `${post.title}.docx`,
          dataUrl: post.originalFileDataUrl,
          fileSize: post.originalFileSize || 0,
          mimeType: post.originalFileDataUrl.split(';')[0]?.replace('data:', '') || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          updatedAt: Date.now()
        };
        fileStore.put(fileRecord);

        // Also save by post.id if fileId is different
        if (post.fileId && post.fileId !== post.id) {
          fileStore.put({ ...fileRecord, id: post.id });
        }
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('savePostToIndexedDb error:', err);
  }
}

/**
 * Batch save multiple MakalahPosts into persistent IndexedDB
 */
export async function batchSavePostsToIndexedDb(posts: MakalahPost[]): Promise<void> {
  if (!posts || posts.length === 0) return;
  try {
    const db = await openMakalahDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_POSTS, STORE_FILES], 'readwrite');
      const postStore = transaction.objectStore(STORE_POSTS);
      const fileStore = transaction.objectStore(STORE_FILES);

      for (const post of posts) {
        postStore.put(post);

        if (post.originalFileDataUrl && post.originalFileDataUrl.startsWith('data:')) {
          const fileRecord: StoredFileRecord = {
            id: post.fileId || post.id,
            fileName: post.originalFileName || `${post.title}.docx`,
            dataUrl: post.originalFileDataUrl,
            fileSize: post.originalFileSize || 0,
            mimeType: post.originalFileDataUrl.split(';')[0]?.replace('data:', '') || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            updatedAt: Date.now()
          };
          fileStore.put(fileRecord);

          if (post.fileId && post.fileId !== post.id) {
            fileStore.put({ ...fileRecord, id: post.id });
          }
        }
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('batchSavePostsToIndexedDb error:', err);
  }
}

/**
 * Retrieve all MakalahPosts from IndexedDB
 */
export async function getAllPostsFromIndexedDb(): Promise<MakalahPost[]> {
  try {
    const db = await openMakalahDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_POSTS, 'readonly');
      const store = transaction.objectStore(STORE_POSTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as MakalahPost[];
        if (Array.isArray(results)) {
          // Sort descending by createdAt
          results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          resolve(results);
        } else {
          resolve([]);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('getAllPostsFromIndexedDb error:', err);
    return [];
  }
}

/**
 * Retrieve a single MakalahPost by ID from IndexedDB
 */
export async function getPostFromIndexedDb(postId: string): Promise<MakalahPost | null> {
  try {
    const db = await openMakalahDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_POSTS, 'readonly');
      const store = transaction.objectStore(STORE_POSTS);
      const request = store.get(postId);

      request.onsuccess = () => resolve((request.result as MakalahPost) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('getPostFromIndexedDb error:', err);
    return null;
  }
}

/**
 * Save standalone binary file dataUrl into IndexedDB
 */
export async function saveFileToIndexedDb(
  fileId: string, 
  dataUrl: string, 
  fileName: string, 
  mimeType?: string
): Promise<void> {
  try {
    const db = await openMakalahDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_FILES, 'readwrite');
      const store = transaction.objectStore(STORE_FILES);

      const record: StoredFileRecord = {
        id: fileId,
        fileName,
        dataUrl,
        fileSize: Math.round((dataUrl.length * 3) / 4),
        mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        updatedAt: Date.now()
      };

      store.put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('saveFileToIndexedDb error:', err);
  }
}

/**
 * Retrieve binary file data from IndexedDB by fileId, postId, or fileName
 */
export async function getFileFromIndexedDb(
  fileIdentifier: string
): Promise<StoredFileRecord | null> {
  try {
    const db = await openMakalahDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_FILES, 'readonly');
      const store = transaction.objectStore(STORE_FILES);

      // 1. Direct get by exact key
      const directReq = store.get(fileIdentifier);
      directReq.onsuccess = () => {
        if (directReq.result) {
          return resolve(directReq.result as StoredFileRecord);
        }

        // 2. Scan all files if direct key didn't match (for matching by fileName)
        const allReq = store.getAll();
        allReq.onsuccess = () => {
          const files = (allReq.result as StoredFileRecord[]) || [];
          const cleanTarget = fileIdentifier.toLowerCase().replace(/\.[a-zA-Z0-9]+$/, '');

          const matched = files.find(f => 
            f.id === fileIdentifier ||
            f.fileName === fileIdentifier ||
            f.fileName.toLowerCase() === fileIdentifier.toLowerCase() ||
            f.fileName.toLowerCase().includes(cleanTarget)
          );

          resolve(matched || null);
        };
        allReq.onerror = () => reject(allReq.error);
      };
      directReq.onerror = () => reject(directReq.error);
    });
  } catch (err) {
    console.warn('getFileFromIndexedDb error:', err);
    return null;
  }
}

/**
 * Delete a post and its associated file from IndexedDB
 */
export async function deletePostFromIndexedDb(postId: string): Promise<void> {
  try {
    const db = await openMakalahDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_POSTS, STORE_FILES], 'readwrite');
      transaction.objectStore(STORE_POSTS).delete(postId);
      transaction.objectStore(STORE_FILES).delete(postId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('deletePostFromIndexedDb error:', err);
  }
}

/**
 * Clear all posts and files from IndexedDB
 */
export async function clearAllFromIndexedDb(): Promise<void> {
  try {
    const db = await openMakalahDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_POSTS, STORE_FILES], 'readwrite');
      transaction.objectStore(STORE_POSTS).clear();
      transaction.objectStore(STORE_FILES).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('clearAllFromIndexedDb error:', err);
  }
}
