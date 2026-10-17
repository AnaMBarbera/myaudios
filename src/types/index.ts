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

export interface CourseLevel {
  id: string;
  name: string;        // e.g. "Inglés B1", "Inglés B2"
  description?: string;
  order: number;
  teacherIds?: string[]; // IDs of teachers who impart this course (multi-teacher support)
  createdById?: string;  // User ID who created the course
  createdAt?: number;
}

export interface CourseLesson {
  id: string;
  levelId: string;     // connects to CourseLevel.id
  title: string;       // e.g. "Lección 1"
  subtitle?: string;   // e.g. "Conversación en el restaurante y reservas"
  order: number;
  isHidden?: boolean;  // whether user hid this lesson
}

export interface AudioTranscriptItem {
  id: string;
  title: string;
  description?: string;
  category: Category;
  level: CefrLevel;
  accent: Accent;
  levelId?: string;    // e.g. "ingles_b1"
  lessonId?: string;   // e.g. "b1_leccion_1"
  audioUrl?: string;   // Blob URL, object URL, or synthetic fallback
  audioFileName?: string;
  audioFileSize?: number;
  audioDuration?: number; // duration in seconds
  audioBlobId?: string; // key in IndexedDB
  segments: TranscriptSegment[];
  isBuiltIn?: boolean;
  createdAt: number;
  tags: string[];
  notes?: string;
  driveFolderUrl?: string;
  isHidden?: boolean;  // whether user hid this audio
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
  levelId?: string;
  lessonId?: string;
  category: Category;
  accent: Accent;
  tags: string[];
  segments: TranscriptSegment[];
}

export type UserRole = 'admin' | 'teacher' | 'student';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  password?: string;
  createdAt: number;
  lastLoginAt?: number;
  isActive: boolean;
  notes?: string;
  enrolledCourseIds?: string[]; // IDs of courses/levels the student is enrolled in
}

export interface UserPermissions {
  canManageUsers: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
  canUploadAudios: boolean;
  canViewAudios: boolean;
  canCreateCourses: boolean;
}
