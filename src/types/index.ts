export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type Category = 
  | 'all'
  | 'conversation' 
  | 'business' 
  | 'news' 
  | 'academic' 
  | 'travel' 
  | 'pronunciation' 
  | 'custom';

export type Accent = 'US' | 'UK' | 'AU' | 'International';

export interface WordInfo {
  word: string;
  start?: number;
  end?: number;
}

export interface TranscriptSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  speaker?: string;
  text: string;
  translation?: string; // Spanish translation
  notes?: string;
}

export interface AudioTranscriptItem {
  id: string;
  title: string;
  description?: string;
  category: Category;
  level: CefrLevel;
  accent: Accent;
  audioUrl?: string; // Blob URL, object URL, or synthetic fallback
  audioFileName?: string;
  audioFileSize?: number;
  audioDuration?: number; // duration in seconds
  audioBlobId?: string; // key in IndexedDB
  segments: TranscriptSegment[];
  isBuiltIn?: boolean;
  createdAt: number;
  tags: string[];
  notes?: string;
}

export interface SavedWord {
  id: string;
  word: string;
  phonetic: string;
  definition: string;
  spanish: string;
  example: string;
  sourceAudioId?: string;
  sourceAudioTitle?: string;
  sourceSegmentId?: string;
  addedAt: number;
  mastered: boolean;
}

export interface AudioTranscriptPairingDraft {
  audioFile?: File;
  audioFileName?: string;
  audioDuration?: number;
  transcriptFile?: File;
  rawText?: string;
  format?: 'srt' | 'vtt' | 'plain' | 'json';
  title: string;
  level: CefrLevel;
  category: Category;
  accent: Accent;
  tags: string[];
  segments: TranscriptSegment[];
}
