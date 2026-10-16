import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  FolderSync, 
  Upload, 
  FileAudio, 
  FileText, 
  Check, 
  Link2, 
  Layers, 
  Plus,
  AlertCircle
} from 'lucide-react';
import { AudioTranscriptItem, CourseLevel, CourseLesson } from '../types';
import { parseSRT, parseVTT, parsePlainText } from '../utils/transcriptParser';

interface DriveFolderImportModalProps {
  levels: CourseLevel[];
  lessons: CourseLesson[];
  onClose: () => void;
  onImportItems: (newItems: { item: AudioTranscriptItem; audioBlob?: Blob }[]) => void;
  onAddLevel: (name: string) => CourseLevel;
  onAddLesson: (levelId: string, title: string, subtitle?: string) => CourseLesson;
}

export const DriveFolderImportModal: React.FC<DriveFolderImportModalProps> = ({
  levels,
  lessons,
  onClose,
  onImportItems,
  onAddLevel,
  onAddLesson,
}) => {
  const driveFolderUrl = 'https://drive.google.com/drive/folders/11lm0saJUirSeQz2i4YFU4-cUH9hShlSX?usp=drive_link';
  
  const [selectedLevelId, setSelectedLevelId] = useState<string>(levels[0]?.id || 'ingles_b1');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    lessons.find(l => l.levelId === (levels[0]?.id || 'ingles_b1'))?.id || ''
  );

  // New level / lesson inline creation
  const [isCreatingLevel, setIsCreatingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonSubtitle, setNewLessonSubtitle] = useState('');

  // Uploaded files buffer
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [transcriptFiles, setTranscriptFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter lessons for selected level
  const currentLessons = lessons.filter(l => l.levelId === selectedLevelId);

  // Handle files drop / selection
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const newAudios: File[] = [];
    const newTranscripts: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac'].includes(ext || '')) {
        newAudios.push(f);
      } else if (['srt', 'vtt', 'txt', 'json'].includes(ext || '')) {
        newTranscripts.push(f);
      }
    }

    setAudioFiles(prev => [...prev, ...newAudios]);
    setTranscriptFiles(prev => [...prev, ...newTranscripts]);
  };

  const handleCreateLevel = () => {
    if (!newLevelName.trim()) return;
    const created = onAddLevel(newLevelName.trim());
    setSelectedLevelId(created.id);
    setIsCreatingLevel(false);
    setNewLevelName('');
  };

  const handleCreateLesson = () => {
    if (!newLessonTitle.trim()) return;
    const created = onAddLesson(selectedLevelId, newLessonTitle.trim(), newLessonSubtitle.trim());
    setSelectedLessonId(created.id);
    setIsCreatingLesson(false);
    setNewLessonTitle('');
    setNewLessonSubtitle('');
  };

  // Process and import matched files
  const handleExecuteImport = async () => {
    if (audioFiles.length === 0 && transcriptFiles.length === 0) {
      alert('Por favor selecciona al menos un archivo de audio o transcripción.');
      return;
    }

    setIsProcessing(true);
    const result: { item: AudioTranscriptItem; audioBlob?: Blob }[] = [];

    // Helper to read text
    const readFileText = (f: File): Promise<string> => {
      return new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string) || '');
        reader.readAsText(f);
      });
    };

    // Helper to get audio duration
    const getDuration = (f: File): Promise<number> => {
      return new Promise((res) => {
        const url = URL.createObjectURL(f);
        const a = new Audio(url);
        a.onloadedmetadata = () => {
          const d = a.duration || 30;
          URL.revokeObjectURL(url);
          res(d);
        };
        a.onerror = () => {
          URL.revokeObjectURL(url);
          res(30);
        };
      });
    };

    try {
      // If we have audio files, match each with transcripts
      for (const audio of audioFiles) {
        const baseName = audio.name.replace(/\.[^/.]+$/, '').toLowerCase();
        
        // Find matching transcript file if available
        const matchedTranscript = transcriptFiles.find(t => {
          const tBase = t.name.replace(/\.[^/.]+$/, '').toLowerCase();
          return tBase === baseName || tBase.includes(baseName) || baseName.includes(tBase);
        });

        let segments: any[] = [];
        const dur = await getDuration(audio);

        if (matchedTranscript) {
          const content = await readFileText(matchedTranscript);
          const ext = matchedTranscript.name.split('.').pop()?.toLowerCase();
          if (ext === 'srt') {
            segments = parseSRT(content);
          } else if (ext === 'vtt') {
            segments = parseVTT(content);
          } else {
            segments = parsePlainText(content, dur);
          }
        } else {
          segments = [
            {
              id: `seg_${Date.now()}_1`,
              startTime: 0,
              endTime: dur,
              text: `Audio de ${audio.name} (transcripción pendiente de sincronizar)`,
            }
          ];
        }

        const cleanTitle = audio.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        const targetLevel = levels.find(l => l.id === selectedLevelId);

        const newItem: AudioTranscriptItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          description: `Importado para ${targetLevel?.name || 'Inglés B1'}`,
          category: 'conversation',
          level: (targetLevel?.name?.includes('B2') ? 'B2' : targetLevel?.name?.includes('C1') ? 'C1' : targetLevel?.name?.includes('A2') ? 'A2' : 'B1'),
          levelId: selectedLevelId,
          lessonId: selectedLessonId || undefined,
          accent: 'US',
          audioDuration: dur,
          audioFileName: audio.name,
          audioFileSize: audio.size,
          audioBlobId: `blob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          segments,
          createdAt: Date.now(),
          tags: ['Google Drive', targetLevel?.name || 'Inglés B1'],
          driveFolderUrl,
        };

        result.push({ item: newItem, audioBlob: audio });
      }

      onImportItems(result);
      onClose();
    } catch (err) {
      console.error('Error importing files:', err);
      alert('Hubo un error procesando los archivos.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Organizar Audios de Google Drive
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Conexión con tu carpeta compartida y asignación a lecciones
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Drive Link Strip */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Carpeta de Origen de tus Audios y Transcripciones:
            </span>
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir en Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {driveFolderUrl}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Puedes descargar tus audios y transcripciones desde tu carpeta de Drive y soltarlos aquí para que el sistema los empareje automáticamente y los organice en tus lecciones.
          </p>
        </div>

        {/* Destination Assignment: Nivel & Lección */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Asignar a Estructura de Curso (Ej: Inglés B1 &gt; Lección 1)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Level selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-600 dark:text-slate-400">Nivel de Inglés:</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingLevel(!isCreatingLevel)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {isCreatingLevel ? 'Cancelar' : '+ Nuevo Nivel'}
                </button>
              </div>

              {isCreatingLevel ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLevelName}
                    onChange={(e) => setNewLevelName(e.target.value)}
                    placeholder="Ej: Inglés B2, Inglés C1..."
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateLevel}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer"
                  >
                    Crear
                  </button>
                </div>
              ) : (
                <select
                  value={selectedLevelId}
                  onChange={(e) => {
                    setSelectedLevelId(e.target.value);
                    const firstLesson = lessons.find(l => l.levelId === e.target.value);
                    setSelectedLessonId(firstLesson?.id || '');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer font-medium"
                >
                  {levels.map(lvl => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Lesson selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-600 dark:text-slate-400">Lección:</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingLesson(!isCreatingLesson)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {isCreatingLesson ? 'Cancelar' : '+ Nueva Lección'}
                </button>
              </div>

              {isCreatingLesson ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="Ej: Lección 1, Lección 2..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    value={newLessonSubtitle}
                    onChange={(e) => setNewLessonSubtitle(e.target.value)}
                    placeholder="Subtítulo opcional (Ej: Vocabulario de viajes)"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateLesson}
                    className="w-full py-1.5 bg-indigo-600 text-white rounded-lg cursor-pointer"
                  >
                    Guardar Lección
                  </button>
                </div>
              ) : (
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer font-medium"
                >
                  {currentLessons.length === 0 ? (
                    <option value="">(Sin lecciones aún en este nivel)</option>
                  ) : (
                    currentLessons.map(les => (
                      <option key={les.id} value={les.id}>
                        {les.title} {les.subtitle ? `- ${les.subtitle}` : ''}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* File Dropzone */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Cargar Archivos de Audio y Transcripciones
          </label>

          <div 
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
          >
            <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Arrastra aquí los archivos de tu carpeta de Drive
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Puedes soltar simultáneamente los audios (.mp3, .wav, .m4a) y sus subtítulos (.srt, .vtt, .txt)
            </p>

            <label className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer inline-block">
              Seleccionar archivos
              <input
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.srt,.vtt,.txt"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {/* Staged files summary */}
          {(audioFiles.length > 0 || transcriptFiles.length > 0) && (
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-700 dark:text-slate-300">
                  Archivos preparados para importar:
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {audioFiles.length} audios · {transcriptFiles.length} transcripciones
                </span>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 transcript-scroll">
                {audioFiles.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <FileAudio className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{a.name}</span>
                  </div>
                ))}
                {transcriptFiles.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={isProcessing || (audioFiles.length === 0 && transcriptFiles.length === 0)}
            className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? 'Importando...' : 'Organizar e Importar'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
