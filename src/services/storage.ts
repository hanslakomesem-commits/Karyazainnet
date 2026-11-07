import { JournalTemplateConfig } from '../types/template';
import { FormattingHistoryItem } from '../types/history';

const DB_NAME = 'TemplateJurnalDB';
const DB_VERSION = 2;
const TEMPLATES_STORE = 'templates';
const HISTORY_STORE = 'history';
const BLOBS_STORE = 'blobs';
const SETTINGS_STORE = 'settings';

export const DEFAULT_TEMPLATES: JournalTemplateConfig[] = [];

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB tidak didukung oleh browser Anda.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
          db.createObjectStore(TEMPLATES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(BLOBS_STORE)) {
          db.createObjectStore(BLOBS_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  async getTemplates(): Promise<JournalTemplateConfig[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TEMPLATES_STORE, 'readonly');
        const req = tx.objectStore(TEMPLATES_STORE).getAll();
        req.onsuccess = () => {
          const list = req.result as JournalTemplateConfig[];
          resolve(list || []);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async seedDefaultTemplates(): Promise<JournalTemplateConfig[]> {
    return [];
  }

  async saveTemplate(template: JournalTemplateConfig): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(TEMPLATES_STORE, 'readwrite');
    tx.objectStore(TEMPLATES_STORE).put(template);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(TEMPLATES_STORE, 'readwrite');
    tx.objectStore(TEMPLATES_STORE).delete(id);
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  }

  async getHistory(): Promise<FormattingHistoryItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(HISTORY_STORE, 'readonly');
        const req = tx.objectStore(HISTORY_STORE).getAll();
        req.onsuccess = () => {
          const list = (req.result as FormattingHistoryItem[]) || [];
          list.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async addHistory(item: FormattingHistoryItem): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    tx.objectStore(HISTORY_STORE).put(item);
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  }

  async deleteHistoryItem(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    tx.objectStore(HISTORY_STORE).delete(id);
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  }

  async resetToDefaults(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(TEMPLATES_STORE, 'readwrite');
    const store = tx.objectStore(TEMPLATES_STORE);
    store.clear();
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  }

  async clearAllTemplates(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(TEMPLATES_STORE, 'readwrite');
    tx.objectStore(TEMPLATES_STORE).clear();
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  }

  async clearHistory(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    tx.objectStore(HISTORY_STORE).clear();
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  }

  async saveDocxBlob(key: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(BLOBS_STORE, 'readwrite');
    tx.objectStore(BLOBS_STORE).put({ key, blob, createdAt: Date.now() });
  }

  async getDocxBlob(key: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(BLOBS_STORE, 'readonly');
        const req = tx.objectStore(BLOBS_STORE).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.blob : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
}

export const storageService = new StorageService();
