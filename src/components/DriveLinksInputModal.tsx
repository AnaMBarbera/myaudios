import React, { useState, useEffect } from 'react';
import { 
  X, 
  Link2, 
  Check, 
  Play, 
  Pause, 
  ExternalLink, 
  FileAudio, 
  FileText, 
  AlertCircle, 
  Upload, 
  FolderSync, 
  Plus, 
  Sparkles,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { AudioTranscriptItem, CourseLevel, CourseLesson, CefrLevel, TranscriptSegment } from '../types';
import { parseDriveLink, fetchTranscriptFromUrl } from '../utils/driveLinks';
import { autoDetectAndParseTranscript, formatTime } from '../utils/transcriptParser';

interface DriveLinksInputModalProps {
  levels: CourseLevel[];
  lessons: CourseLesson[];
  defaultLevelId: string;
  defaultLessonId: string;
  onClose: () => void;
  onSave: (newItem: AudioTranscriptItem) => void;
  onAddLevel: (name: string) => CourseLevel;
  onAddLesson: (levelId: string, title: string, subtitle?: string) => CourseLesson;
}

export const DriveLinksInputModal: React.FC<DriveLinksInputModalProps> = ({
  levels,
  lessons,
  defaultLevelId,
  defaultLessonId,
  onClose,
  onSave,
  onAddLevel,
  onAddLesson,
}) => {
  const driveSharedFolderUrl = 'https://drive.google.com/drive/folders/11lm0saJUirSeQz2i4YFU4-cUH9hShlSX?usp=drive_link';

  // 1. Audio link state
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [isFolderError, setIsFolderError] = useState(false);

  // 2. Transcript & VTT detection state
  const [transcriptTab, setTranscriptTab] = useState<'upload-vtt' | 'drive-vtt-link' | 'paste-vtt'>('upload-vtt');
  const [vttDriveUrlInput, setVttDriveUrlInput] = useState('');
  const [manualText, setManualText] = useState('');
  const [uploadedVttFileName, setUploadedVttFileName] = useState<string | null>(null);

  // Parsed segments and format detection
  const [detectedFormat, setDetectedFormat] = useState<'vtt' | 'srt' | 'plain' | null>(null);
  const [preparedSegments, setPreparedSegments] = useState<TranscriptSegment[]>([]);
  const [showCuesPreview, setShowCuesPreview] = useState<boolean>(true);

  // Hierarchy assignment
  const [selectedLevelId, setSelectedLevelId] = useState<string>(defaultLevelId || levels[0]?.id || 'ingles_b1');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    defaultLessonId || lessons.find(l => l.levelId === (defaultLevelId || 'ingles_b1'))?.id || ''
  );

  // Inline creation of levels and lessons
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonSubtitle, setNewLessonSubtitle] = useState('');

  // Track metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accent, setAccent] = useState<'US' | 'UK' | 'AU' | 'International'>('US');

  // Audio testing and verification
  const [isVerifyingAudio, setIsVerifyingAudio] = useState(false);
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [testAudioPlaying, setTestAudioPlaying] = useState(false);
  const [testAudioElement, setTestAudioElement] = useState<HTMLAudioElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentLessons = lessons.filter(l => l.levelId === selectedLevelId);
  const activeLevel = levels.find(l => l.id === selectedLevelId);

  // Clean audio player on unmount
  useEffect(() => {
    return () => {
      if (testAudioElement) {
        testAudioElement.pause();
      }
    };
  }, [testAudioElement]);

  // Check if input is a Google Drive folder link
  const handleAudioInputChange = (val: string) => {
    setAudioUrlInput(val);
    const parsed = parseDriveLink(val);
    setIsFolderError(Boolean(parsed.isFolder));
  };

  // Re-detect format whenever manual text changes in paste mode
  useEffect(() => {
    if (transcriptTab === 'paste-vtt' && manualText.trim()) {
      const detection = autoDetectAndParseTranscript(manualText, audioDuration || 30);
      setDetectedFormat(detection.format);
      setPreparedSegments(detection.segments);
    }
  }, [manualText, transcriptTab, audioDuration]);

  // Handle uploaded .vtt or .srt file
  const handleVTTFileUpload = (file: File) => {
    const reader = new FileReader();
    setUploadedVttFileName(file.name);

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const detection = autoDetectAndParseTranscript(content, audioDuration || 30);
      setDetectedFormat(detection.format);
      setPreparedSegments(detection.segments);
      setManualText(content);
      setErrorMessage(null);

      // Auto-populate title if empty
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo .vtt. Por favor prueba a copiar y pegar su contenido.');
    };

    reader.readAsText(file);
  };

  // Real-time manual text parser
  const handleManualTextChange = (text: string) => {
    setManualText(text);
    if (!text.trim()) {
      setPreparedSegments([]);
      setDetectedFormat(null);
      return;
    }

    const detection = autoDetectAndParseTranscript(text, audioDuration || 30);
    setPreparedSegments(detection.segments);
    setDetectedFormat(detection.format);
  };

  // Fetch transcript from Google Drive link
  const handleFetchDriveVTT = async () => {
    if (!vttDriveUrlInput.trim()) {
      setErrorMessage('Por favor introduce el enlace de la transcripción en Google Drive.');
      return;
    }

    setIsFetchingTranscript(true);
    setErrorMessage(null);

    try {
      const rawText = await fetchTranscriptFromUrl(vttDriveUrlInput);
      const detection = autoDetectAndParseTranscript(rawText, audioDuration || 30);
      setDetectedFormat(detection.format);
      setPreparedSegments(detection.segments);
      setManualText(rawText);
    } catch (err: any) {
      console.warn('Transcript fetch error:', err);
      setErrorMessage(
        'No se pudo descargar automáticamente la transcripción del enlace de Drive. Asegúrate de que el archivo tenga permiso "Cualquiera con el enlace puede ver", o copia y pega el contenido en la pestaña "Pegar Texto .VTT".'
      );
    } finally {
      setIsFetchingTranscript(false);
    }
  };

  // Test audio connection
  const handleTestAudioStream = async () => {
    if (!audioUrlInput.trim()) {
      setErrorMessage('Por favor introduce el enlace del archivo de audio en Google Drive.');
      return;
    }

    setIsVerifyingAudio(true);
    setErrorMessage(null);

    try {
      const parsedAudio = parseDriveLink(audioUrlInput);
      if (parsedAudio.isFolder) {
        throw new Error(
          'El enlace que has introducido corresponde a una carpeta entera. Abre la carpeta en Google Drive, haz clic derecho sobre el archivo de audio (.mp3 o .wav) y selecciona "Compartir > Copiar enlace".'
        );
      }

      const streamUrl = parsedAudio.proxyStreamUrl || parsedAudio.directStreamUrl;
      const testAudio = new Audio(streamUrl);
      testAudio.preload = 'metadata';

      const dur = await new Promise<number>((resolve) => {
        const timeout = setTimeout(() => resolve(30), 7000);
        testAudio.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve(testAudio.duration || 30);
        };
        testAudio.onerror = () => {
          clearTimeout(timeout);
          // Try direct fallback
          if (parsedAudio.directStreamUrl && parsedAudio.directStreamUrl !== streamUrl) {
            const alt = new Audio(parsedAudio.directStreamUrl);
            alt.onloadedmetadata = () => resolve(alt.duration || 30);
            alt.onerror = () => resolve(30);
          } else {
            resolve(30);
          }
        };
      });

      setAudioDuration(dur);
      setTestAudioElement(testAudio);

      // Auto title if empty
      if (!title) {
        const targetLesson = lessons.find(l => l.id === selectedLessonId);
        setTitle(targetLesson ? `${targetLesson.title} - Audio Drive` : 'Pista de Audio Google Drive');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error conectando con el enlace de audio de Google Drive.');
    } finally {
      setIsVerifyingAudio(false);
    }
  };

  const toggleTestPlay = () => {
    if (!testAudioElement) return;
    if (testAudioPlaying) {
      testAudioElement.pause();
      setTestAudioPlaying(false);
    } else {
      testAudioElement.play().catch(console.warn);
      setTestAudioPlaying(true);
      testAudioElement.onended = () => setTestAudioPlaying(false);
    }
  };

  const handleCreateLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) return;
    const created = onAddLevel(newLevelName.trim());
    setSelectedLevelId(created.id);
    setNewLevelName('');
    setIsAddingLevel(false);
  };

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !activeLevel) return;
    const created = onAddLesson(activeLevel.id, newLessonTitle.trim(), newLessonSubtitle.trim());
    setSelectedLessonId(created.id);
    setNewLessonTitle('');
    setNewLessonSubtitle('');
    setIsAddingLesson(false);
  };

  const handleSaveTrack = () => {
    if (!audioUrlInput.trim()) {
      alert('Introduce el enlace de audio.');
      return;
    }
    if (!title.trim()) {
      alert('Introduce un título para la pista.');
      return;
    }

    const parsedAudio = parseDriveLink(audioUrlInput);
    const streamUrl = parsedAudio.proxyStreamUrl || parsedAudio.directStreamUrl;

    // Use prepared segments if available, or parse manual text
    let finalSegments = preparedSegments;
    if (finalSegments.length === 0 && manualText.trim()) {
      const detection = autoDetectAndParseTranscript(manualText, audioDuration || 30);
      finalSegments = detection.segments;
    }

    if (finalSegments.length === 0) {
      finalSegments = [
        {
          id: `seg_${Date.now()}_1`,
          startTime: 0,
          endTime: audioDuration || 30,
          text: 'Audio enlazado desde Google Drive listo para escuchar y practicar.',
        }
      ];
    }

    const newItem: AudioTranscriptItem = {
      id: `item_drive_${Date.now()}`,
      title: title.trim(),
      description: description.trim() || `Audio desde enlace de Google Drive`,
      category: 'conversation',
      level: (activeLevel?.name?.includes('B2') ? 'B2' : activeLevel?.name?.includes('C1') ? 'C1' : activeLevel?.name?.includes('A2') ? 'A2' : 'B1') as CefrLevel,
      levelId: selectedLevelId,
      lessonId: selectedLessonId || undefined,
      accent,
      audioUrl: streamUrl,
      audioDuration: audioDuration || 30,
      audioFileName: `Google Drive (${parsedAudio.fileId || 'Audio'})`,
      segments: finalSegments,
      createdAt: Date.now(),
      tags: ['Google Drive', activeLevel?.name || 'Inglés B1', detectedFormat ? `Formato ${detectedFormat.toUpperCase()}` : 'VTT'],
      driveFolderUrl: audioUrlInput,
    };

    if (testAudioElement) {
      testAudioElement.pause();
    }

    onSave(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-6 max-h-[92vh] overflow-y-auto transcript-scroll">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Acceder a Audios mediante Enlace & Transcripción .VTT
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conecta tus enlaces de Drive sin descargar archivos a tu equipo y mantén las marcas de tiempo exactas del .VTT
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (testAudioElement) testAudioElement.pause();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Course Menu Structure Section: Inglés B1 > Lección 1 */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
              Estructura en el Menú: Nivel &gt; Lección
            </span>
            <span className="text-[11px] text-slate-500">
              Menú jerárquico ampliable con Inglés B2, C1...
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Level selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Nivel de Inglés:</span>
                <button
                  type="button"
                  onClick={() => setIsAddingLevel(!isAddingLevel)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                >
                  {isAddingLevel ? 'Cancelar' : '+ Añadir Nivel (ej: Inglés B2)'}
                </button>
              </div>

              {isAddingLevel ? (
                <form onSubmit={handleCreateLevel} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newLevelName}
                    onChange={(e) => setNewLevelName(e.target.value)}
                    placeholder="Ej: Inglés B2"
                    className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    autoFocus
                  />
                  <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg cursor-pointer font-medium">
                    Crear
                  </button>
                </form>
              ) : (
                <select
                  value={selectedLevelId}
                  onChange={(e) => {
                    setSelectedLevelId(e.target.value);
                    const firstLesson = lessons.find(l => l.levelId === e.target.value);
                    setSelectedLessonId(firstLesson?.id || '');
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  {levels.map(lvl => (
                    <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Lesson selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Lección:</span>
                <button
                  type="button"
                  onClick={() => setIsAddingLesson(!isAddingLesson)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                >
                  {isAddingLesson ? 'Cancelar' : '+ Añadir Lección'}
                </button>
              </div>

              {isAddingLesson ? (
                <form onSubmit={handleCreateLesson} className="space-y-1.5">
                  <input
                    type="text"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="Ej: Lección 1"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                    autoFocus
                  />
                  <div className="flex gap-1 justify-end">
                    <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded-md cursor-pointer font-medium">
                      Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  {currentLessons.length === 0 ? (
                    <option value="">(Sin lecciones aún en este nivel - pulsa + Añadir Lección)</option>
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

        {/* Input 1: Enlace del Audio en Google Drive */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              1. Enlace del Audio en Google Drive:
            </label>
            <a
              href={driveSharedFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Carpeta en Google Drive</span>
            </a>
          </div>

          <div className="relative">
            <FileAudio className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={audioUrlInput}
              onChange={(e) => handleAudioInputChange(e.target.value)}
              placeholder="https://drive.google.com/file/d/1XyZ.../view?usp=sharing"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-mono"
            />
          </div>

          {isFolderError && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 rounded-xl border border-amber-300 dark:border-amber-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Has pegado el enlace de la carpeta completa de Google Drive.</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Para enlazar un audio específico: abre la carpeta en Drive, haz clic derecho sobre el archivo de audio (.mp3 o .wav), selecciona <strong>Compartir &gt; Copiar enlace</strong> y pégalo aquí.
                </p>
              </div>
            </div>
          )}

          {/* Test audio verification row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestAudioStream}
              disabled={isVerifyingAudio || !audioUrlInput.trim()}
              className="px-3.5 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isVerifyingAudio ? 'Comprobando audio...' : 'Comprobar Enlace de Audio'}</span>
            </button>

            {audioDuration > 0 && (
              <button
                type="button"
                onClick={toggleTestPlay}
                className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg font-medium cursor-pointer flex items-center gap-1.5 text-xs"
              >
                {testAudioPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{testAudioPlaying ? 'Pausar Test' : 'Escuchar Muestra'}</span>
              </button>
            )}

            {audioDuration > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400 font-mono font-medium text-xs">
                ✓ Conectado ({formatTime(audioDuration)})
              </span>
            )}
          </div>
        </div>

        {/* Input 2: Transcripción con Detección Estricta de .VTT */}
        <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              2. Transcripción con Detección de .VTT (Marcas de Tiempo):
            </label>
            
            {/* 3 Input Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTranscriptTab('upload-vtt')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  transcriptTab === 'upload-vtt'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Subir Archivo .VTT
              </button>
              <button
                type="button"
                onClick={() => setTranscriptTab('drive-vtt-link')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  transcriptTab === 'drive-vtt-link'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Enlace Drive .VTT
              </button>
              <button
                type="button"
                onClick={() => setTranscriptTab('paste-vtt')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  transcriptTab === 'paste-vtt'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pegar Texto .VTT
              </button>
            </div>
          </div>

          {/* Mode A: Upload .VTT File */}
          {transcriptTab === 'upload-vtt' && (
            <div className="space-y-2">
              <label 
                className="border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/70 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleVTTFileUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                <Upload className="w-7 h-7 text-indigo-600 dark:text-indigo-400 mb-2" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {uploadedVttFileName ? `Archivo: ${uploadedVttFileName}` : 'Selecciona o arrastra tu archivo .vtt'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Detecta automáticamente las marcas de tiempo originales del .vtt
                </span>
                <input
                  type="file"
                  accept=".vtt,.srt,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleVTTFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Mode B: Google Drive Link to .VTT */}
          {transcriptTab === 'drive-vtt-link' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FileText className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vttDriveUrlInput}
                    onChange={(e) => setVttDriveUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view (enlace al archivo .vtt en Drive)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchDriveVTT}
                  disabled={isFetchingTranscript || !vttDriveUrlInput.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isFetchingTranscript ? 'Cargando...' : 'Cargar .VTT'}
                </button>
              </div>
            </div>
          )}

          {/* Mode C: Paste raw .VTT text */}
          {transcriptTab === 'paste-vtt' && (
            <div className="space-y-1.5">
              <textarea
                value={manualText}
                onChange={(e) => handleManualTextChange(e.target.value)}
                rows={5}
                placeholder="Pega aquí el contenido de tu archivo WebVTT (ej: WEBVTT, 00:01.000 --> 00:03.500...)"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
              />
            </div>
          )}

          {/* Explicit VTT Detection Status Card */}
          {detectedFormat === 'vtt' && preparedSegments.length > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs block">
                      🎯 Archivo .VTT detectado con éxito ({preparedSegments.length} marcas de tiempo)
                    </span>
                    <span className="text-[11px] opacity-90 block">
                      Se usarán las <strong>marcas de tiempo exactas</strong> del archivo .vtt sin dividirlas en frases automáticas.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCuesPreview(!showCuesPreview)}
                  className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>{showCuesPreview ? 'Ocultar Cues' : 'Ver Cues'}</span>
                </button>
              </div>

              {/* Collapsible preview of exact cues */}
              {showCuesPreview && (
                <div className="max-h-36 overflow-y-auto space-y-1 pt-2 border-t border-emerald-200 dark:border-emerald-800/80 transcript-scroll text-[11px] font-mono">
                  {preparedSegments.slice(0, 8).map((seg, idx) => (
                    <div key={seg.id} className="flex items-baseline gap-2 py-0.5 px-2 bg-emerald-100/50 dark:bg-emerald-900/40 rounded">
                      <span className="text-emerald-800 dark:text-emerald-200 font-bold">#{idx + 1}</span>
                      <span className="text-emerald-700 dark:text-emerald-300 shrink-0">
                        [{formatTime(seg.startTime, true)} → {formatTime(seg.endTime, true)}]
                      </span>
                      {seg.speaker && <span className="font-bold text-slate-800 dark:text-slate-100">{seg.speaker}:</span>}
                      <span className="truncate text-slate-700 dark:text-slate-200">{seg.text}</span>
                    </div>
                  ))}
                  {preparedSegments.length > 8 && (
                    <div className="text-center text-[10px] text-emerald-700 dark:text-emerald-400 italic pt-1">
                      ... y {preparedSegments.length - 8} marcas de tiempo más preservadas
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {detectedFormat === 'srt' && preparedSegments.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>✓ Subtítulos .SRT detectados: {preparedSegments.length} marcas de tiempo exactas preservadas.</span>
            </div>
          )}

          {detectedFormat === 'plain' && preparedSegments.length > 0 && (
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Texto plano: no se detectaron marcas de tiempo, se dividirá en frases según los puntos.</span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs rounded-xl border border-rose-200 dark:border-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title and Accent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">
              Título del Audio:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Diálogo Lección 1"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">
              Acento del Hablante:
            </label>
            <select
              value={accent}
              onChange={(e) => setAccent(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer text-xs"
            >
              <option value="US">Inglés Americano (US)</option>
              <option value="UK">Inglés Británico (UK)</option>
              <option value="AU">Inglés Australiano (AU)</option>
              <option value="International">Internacional</option>
            </select>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              if (testAudioElement) testAudioElement.pause();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSaveTrack}
            disabled={!audioUrlInput.trim()}
            className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Guardar y Vincular Audio</span>
          </button>
        </div>

      </div>
    </div>
  );
};
