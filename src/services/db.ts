import { AudioTranscriptItem, SavedWord, CourseLevel, CourseLesson } from '../types';

const DB_NAME = 'LingoSyncDB';
const DB_VERSION = 2;

interface AudioBlobRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  name: string;
  duration?: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('audios')) {
          db.createObjectStore('audios', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('words')) {
          db.createObjectStore('words', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('levels')) {
          db.createObjectStore('levels', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('lessons')) {
          db.createObjectStore('lessons', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Audio Blob operations (IndexedDB + Server sync)
export async function saveAudioBlob(id: string, blob: Blob, name: string, duration?: number): Promise<void> {
  const db = await getDB();

  // Background sync to server so it is accessible from any URL or device
  blobToBase64(blob).then(base64 => {
    fetch('/api/audio-blob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, mimeType: blob.type || 'audio/mpeg', base64 }),
    }).catch(err => console.warn('Could not sync audio blob to server:', err));
  }).catch(console.warn);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('audios', 'readwrite');
    const store = tx.objectStore('audios');
    const record: AudioBlobRecord = {
      id,
      blob,
      mimeType: blob.type || 'audio/mpeg',
      name,
      duration,
    };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('audios', 'readonly');
    const store = tx.objectStore('audios');
    const req = store.get(id);
    req.onsuccess = async () => {
      const rec = req.result as AudioBlobRecord | undefined;
      if (rec && rec.blob) {
        resolve(rec.blob);
        return;
      }

      // Fallback: fetch from server if accessing from a different URL or device
      try {
        const res = await fetch(`/api/audio-blob/${id}`);
        if (res.ok) {
          const serverBlob = await res.blob();
          resolve(serverBlob);
          return;
        }
      } catch (err) {
        console.warn('Could not retrieve audio from server fallback:', err);
      }
      resolve(null);
    };
    req.onerror = async () => {
      try {
        const res = await fetch(`/api/audio-blob/${id}`);
        if (res.ok) {
          resolve(await res.blob());
          return;
        }
      } catch (e) {}
      resolve(null);
    };
  });
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audios', 'readwrite');
    const store = tx.objectStore('audios');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Item operations (Metadata + Segments)
export async function saveItem(item: AudioTranscriptItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCustomItems(): Promise<AudioTranscriptItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDB();
  try {
    await deleteAudioBlob(id);
  } catch (err) {
    console.warn('Could not remove audio blob:', err);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Course Levels & Lessons persistence
export async function saveCourseLevel(level: CourseLevel): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('levels', 'readwrite');
    const store = tx.objectStore('levels');
    const req = store.put(level);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCourseLevels(): Promise<CourseLevel[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('levels', 'readonly');
    const store = tx.objectStore('levels');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCourseLesson(lesson: CourseLesson): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readwrite');
    const store = tx.objectStore('lessons');
    const req = store.put(lesson);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCourseLessons(): Promise<CourseLesson[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readonly');
    const store = tx.objectStore('lessons');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCourseLesson(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readwrite');
    const store = tx.objectStore('lessons');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCourseLevel(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('levels', 'readwrite');
    const store = tx.objectStore('levels');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Words operations
export async function saveWord(word: SavedWord): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');
    const req = store.put(word);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllWords(): Promise<SavedWord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readonly');
    const store = tx.objectStore('words');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteWord(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
