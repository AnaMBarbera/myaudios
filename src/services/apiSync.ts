import { AudioTranscriptItem, CourseLevel, CourseLesson } from '../types';

export interface ServerLibraryData {
  initialized: boolean;
  items: AudioTranscriptItem[];
  levels: CourseLevel[];
  lessons: CourseLesson[];
  deletedItemIds: string[];
  deletedLessonIds: string[];
  savedAt?: number;
}

export async function fetchServerLibrary(): Promise<ServerLibraryData | null> {
  try {
    const res = await fetch('/api/library');
    if (!res.ok) {
      console.warn('Server library fetch returned status:', res.status);
      return null;
    }
    const data = await res.json();
    return data as ServerLibraryData;
  } catch (err) {
    console.warn('Network error fetching server library:', err);
    return null;
  }
}

export async function persistServerLibrary(data: {
  items: AudioTranscriptItem[];
  levels: CourseLevel[];
  lessons: CourseLesson[];
  deletedItemIds: string[];
  deletedLessonIds: string[];
}): Promise<boolean> {
  try {
    const res = await fetch('/api/library', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initialized: true,
        ...data,
        savedAt: Date.now(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Network error persisting server library:', err);
    return false;
  }
}
