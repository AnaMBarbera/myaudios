import { SavedWord } from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

/**
 * Fetch all saved vocabulary from Firebase Firestore (with fallback to server endpoint)
 */
export async function fetchServerVocabulary(): Promise<SavedWord[]> {
  // 1. Try direct Firestore read
  try {
    const snap = await getDocs(collection(db, 'vocabulary'));
    if (!snap.empty) {
      const words: SavedWord[] = [];
      snap.forEach((d) => {
        const data = d.data() as SavedWord;
        if (data && data.word) {
          words.push(data);
        }
      });
      return words;
    }
  } catch (err) {
    console.warn('[VocabularySync] Direct Firestore read issue, trying API fallback:', err);
  }

  // 2. Try server API
  try {
    const res = await fetch('/api/vocabulary');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data as SavedWord[];
      }
    }
  } catch (err) {
    console.warn('[VocabularySync] API fetch failed:', err);
  }

  return [];
}

/**
 * Save a word to Firebase Firestore and server backup
 */
export async function persistWordToCloud(word: SavedWord): Promise<void> {
  const safeId = word.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanWord: SavedWord = { ...word, id: safeId };

  // 1. Write to Firestore
  try {
    await setDoc(doc(db, 'vocabulary', safeId), cleanWord);
  } catch (err) {
    console.warn('[VocabularySync] Direct Firestore save failed, using server fallback:', err);
  }

  // 2. Backup to server endpoint
  try {
    await fetch('/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: cleanWord }),
    });
  } catch (err) {
    console.warn('[VocabularySync] Server API save failed:', err);
  }
}

/**
 * Delete a word from Firebase Firestore and server backup
 */
export async function deleteWordFromCloud(wordId: string): Promise<void> {
  const safeId = wordId.replace(/[^a-zA-Z0-9_-]/g, '_');

  // 1. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'vocabulary', safeId));
  } catch (err) {
    console.warn('[VocabularySync] Direct Firestore delete failed:', err);
  }

  // 2. Delete from server
  try {
    await fetch(`/api/vocabulary/${encodeURIComponent(safeId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[VocabularySync] Server API delete failed:', err);
  }
}

/**
 * Sync / merge all local and cloud words
 */
export async function syncVocabularyToCloud(words: SavedWord[]): Promise<SavedWord[]> {
  try {
    const res = await fetch('/api/vocabulary/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.words)) {
        return data.words;
      }
    }
  } catch (err) {
    console.warn('[VocabularySync] Sync API failed:', err);
  }
  return words;
}
