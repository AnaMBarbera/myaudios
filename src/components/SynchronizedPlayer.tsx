import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Mic, 
  Square, 
  Eye, 
  EyeOff, 
  Languages, 
  BookmarkPlus, 
  Check, 
  Headphones, 
  BookOpen, 
  Sparkles, 
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  Volume1,
  Pencil,
  Trash2,
  FileText,
  Upload
} from 'lucide-react';
import { AudioTranscriptItem, TranscriptSegment, SavedWord } from '../types';
import { UnifiedAudioPlayer } from '../utils/audioEngine';
import { formatTime, autoDetectAndParseTranscript } from '../utils/transcriptParser';
import { lookupWord, playWordSpeech, WordDefinitionResult } from '../utils/dictionary';
import { VTTAttachModal } from './VTTAttachModal';

interface SynchronizedPlayerProps {
  item: AudioTranscriptItem;
  audioBlobUrl: string | null;
  playerEngine: UnifiedAudioPlayer;
  onBackToLibrary: () => void;
  onSaveWord: (word: SavedWord) => void;
  savedWords: SavedWord[];
  onUpdateItem?: (updatedItem: AudioTranscriptItem) => void;
  onEditItem?: (item: AudioTranscriptItem) => void;
  onToggleHideItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
}

export const SynchronizedPlayer: React.FC<SynchronizedPlayerProps> = ({
  item,
  audioBlobUrl,
  playerEngine,
  onBackToLibrary,
  onSaveWord,
  savedWords,
  onUpdateItem,
  onEditItem,
  onToggleHideItem,
  onDeleteItem,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(item.audioDuration || 30);
  const [activeSegment, setActiveSegment] = useState<TranscriptSegment | null>(null);
  const [speed, setSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [isLoopingSegment, setIsLoopingSegment] = useState<boolean>(false);
  const [isAutoPause, setIsAutoPause] = useState<boolean>(false);
  const [isVttModalOpen, setIsVttModalOpen] = useState<boolean>(false);

  // Determine if item has a valid parsed transcript or only placeholder/empty
  const hasRealSegments = Boolean(
    item.segments &&
    item.segments.length > 0 &&
    !(item.segments.length === 1 && item.segments[0].text.includes('Audio enlazado desde Google Drive'))
  );

  // Active study mode tab
  const [activeTab, setActiveTab] = useState<'transcript' | 'dictation' | 'shadowing' | 'vocab'>('transcript');

  // Word inspector modal state
  const [inspectedWord, setInspectedWord] = useState<WordDefinitionResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [savedSuccessWord, setSavedSuccessWord] = useState<string | null>(null);

  // Dictation mode state
  const [dictationAnswers, setDictationAnswers] = useState<Record<string, string>>({});
  const [dictationFeedback, setDictationFeedback] = useState<Record<string, boolean | null>>({});

  // Shadowing audio recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Auto-scroll ref
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Initialize track on mount or change
  useEffect(() => {
    playerEngine.loadTrack(item, audioBlobUrl);

    playerEngine.onTimeUpdate = (t, d) => {
      setCurrentTime(t);
      if (d > 0) setDuration(d);
    };

    playerEngine.onStateChange = (playing) => {
      setIsPlaying(playing);
    };

    playerEngine.onSegmentChange = (seg) => {
      setActiveSegment(seg);
    };

    playerEngine.onEnded = () => {
      setIsPlaying(false);
    };

    return () => {
      playerEngine.stop();
    };
  }, [item, audioBlobUrl]);

  // Scroll active segment into view
  useEffect(() => {
    if (activeSegment && activeTab === 'transcript') {
      const el = segmentRefs.current.get(activeSegment.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeSegment, activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(5);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    playerEngine.togglePlay();
  };

  const handleSeek = (newTime: number) => {
    playerEngine.seek(newTime);
  };

  const handleSkip = (delta: number) => {
    const next = Math.max(0, Math.min(currentTime + delta, duration));
    playerEngine.seek(next);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    playerEngine.setPlaybackRate(newSpeed);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    playerEngine.setVolume(newVol);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      playerEngine.setVolume(volume || 1);
    } else {
      setIsMuted(true);
      playerEngine.setVolume(0);
    }
  };

  const handleToggleLoop = () => {
    if (isLoopingSegment) {
      setIsLoopingSegment(false);
      playerEngine.setLoopSegment(null);
    } else {
      if (activeSegment) {
        setIsLoopingSegment(true);
        playerEngine.setLoopSegment(activeSegment);
      } else if (item.segments.length > 0) {
        setIsLoopingSegment(true);
        playerEngine.setLoopSegment(item.segments[0]);
        playerEngine.seek(item.segments[0].startTime);
      }
    }
  };

  const handleToggleAutoPause = () => {
    const next = !isAutoPause;
    setIsAutoPause(next);
    playerEngine.setAutoPauseAfterSentence(next);
  };

  const handleJumpToSegment = (seg: TranscriptSegment) => {
    playerEngine.seek(seg.startTime);
    if (!isPlaying) {
      playerEngine.play();
    }
    if (isLoopingSegment) {
      playerEngine.setLoopSegment(seg);
    }
  };

  // Word click inspector
  const handleWordClick = async (wordStr: string) => {
    const clean = wordStr.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»“”]+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»“”]+$/g, '');
    if (!clean) return;
    
    setIsLookingUp(true);
    try {
      const result = await lookupWord(clean);
      setInspectedWord(result);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSaveInspectedWord = () => {
    if (!inspectedWord) return;
    const newWord: SavedWord = {
      id: `w_${Date.now()}_${inspectedWord.word}`,
      word: inspectedWord.word,
      phonetic: inspectedWord.phonetic || `/${inspectedWord.word}/`,
      definition: inspectedWord.definition,
      spanish: inspectedWord.spanish,
      example: inspectedWord.example || `From audio: "${item.title}"`,
      sourceAudioId: item.id,
      sourceAudioTitle: item.title,
      sourceSegmentId: activeSegment?.id,
      addedAt: Date.now(),
      mastered: false,
    };
    onSaveWord(newWord);
    setSavedSuccessWord(inspectedWord.word);
    setTimeout(() => setSavedSuccessWord(null), 2000);
  };

  // Shadowing voice recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      alert('No se pudo acceder al micrófono para el modo shadowing. Asegúrate de permitir los permisos de audio.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Dictation check
  const handleCheckDictation = (segId: string, originalText: string) => {
    const ans = (dictationAnswers[segId] || '').trim().toLowerCase();
    const cleanOrig = originalText.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const cleanAns = ans.replace(/[^a-z0-9\s]/g, '');

    const isMatch = cleanAns === cleanOrig;
    setDictationFeedback(prev => ({ ...prev, [segId]: isMatch }));
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Active Track Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 mb-1 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la Biblioteca</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Nivel {item.level}</span>
            <span aria-hidden="true">·</span>
            <span>Acento {item.accent}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{item.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{item.segments.length} oraciones</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {item.title}
          </h1>

          {/* Quick Audio Actions: Edit, VTT, Hide, Delete */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              onClick={() => setIsVttModalOpen(true)}
              className="px-2.5 py-1 text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 cursor-pointer font-semibold transition-colors shadow-2xs"
              title="Cargar o actualizar el archivo .VTT para este audio"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{hasRealSegments ? 'Actualizar .VTT' : '+ Cargar / Pegar .VTT'}</span>
            </button>

            {onEditItem && (
              <button
                onClick={() => onEditItem(item)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer font-medium transition-colors"
                title="Editar este audio"
              >
                <Pencil className="w-3 h-3" />
                <span>Editar Audio</span>
              </button>
            )}

            {onToggleHideItem && (
              <button
                onClick={() => onToggleHideItem(item.id)}
                className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1 cursor-pointer font-medium transition-colors ${
                  item.isHidden 
                    ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                title={item.isHidden ? 'Mostrar audio en los menús' : 'Ocultar audio'}
              >
                {item.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{item.isHidden ? 'Desocultar' : 'Ocultar Audio'}</span>
              </button>
            )}

            {onDeleteItem && (
              <button
                onClick={() => onDeleteItem(item.id)}
                className="px-2.5 py-1 text-xs rounded-lg border border-rose-200 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-1 cursor-pointer font-medium transition-colors"
                title="Eliminar este audio"
              >
                <Trash2 className="w-3 h-3" />
                <span>Eliminar</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Tabs (Single-line interactive buttons) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-center overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'transcript'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Escucha Sincronizada</span>
          </button>

          <button
            onClick={() => setActiveTab('dictation')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dictation'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Test de Dictado</span>
          </button>

          <button
            onClick={() => setActiveTab('shadowing')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'shadowing'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Shadowing & Voz</span>
          </button>
        </div>
      </div>

      {/* Main Persistent Audio Control Deck */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        {/* Timeline Waveform & Scrubber */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{formatTime(currentTime, true)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div 
            className="relative h-4 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer overflow-hidden group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              handleSeek(pos * duration);
            }}
          >
            {/* Visual sentence boundary markers on the scrubber */}
            {item.segments.map(s => {
              const leftPercent = duration > 0 ? (s.startTime / duration) * 100 : 0;
              return (
                <div
                  key={s.id}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-300 dark:bg-slate-700 pointer-events-none"
                  title={`${s.speaker || ''}: ${s.text}`}
                />
              );
            })}

            {/* Current progress fill */}
            <div
              style={{ width: `${progressPercent}%` }}
              className="absolute top-0 bottom-0 left-0 bg-indigo-600 rounded-full transition-all duration-75"
            />
          </div>
        </div>

        {/* Transport Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Main playback buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSkip(-5)}
              title="Retroceder 5 segundos (Flecha izquierda)"
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
              className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => handleSkip(5)}
              title="Adelantar 5 segundos (Flecha derecha)"
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Sentence Loop (A-B Repeat) */}
            <button
              onClick={handleToggleLoop}
              title={isLoopingSegment ? 'Desactivar repetición de frase' : 'Repetir en bucle la frase activa'}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isLoopingSegment
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isLoopingSegment ? 'Repitiendo frase' : 'Repetir frase'}</span>
            </button>

            {/* Auto-pause after sentence */}
            <button
              onClick={handleToggleAutoPause}
              title="Pausar automáticamente al final de cada oración para practicar repetición (Shadowing)"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isAutoPause
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{isAutoPause ? 'Auto-pausa Activa' : 'Auto-pausa Frase'}</span>
            </button>
          </div>

          {/* Speed & Volume settings */}
          <div className="flex items-center gap-4">
            {/* Speed selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 shrink-0">Velocidad:</span>
              {[0.5, 0.75, 0.85, 1.0, 1.25, 1.5, 2.0].map(rate => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer shrink-0 ${
                    speed === rate
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Volume control */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-18 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mode View Content */}
      {activeTab === 'transcript' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Synchronized Transcript View (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span>Pulsa cualquier palabra para ver su significado y pronunciación</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsVttModalOpen(true)}
                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{hasRealSegments ? 'Actualizar .VTT' : '+ Cargar .VTT'}</span>
                </button>
                <button
                  onClick={() => setShowTranslations(!showTranslations)}
                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  {showTranslations ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showTranslations ? 'Ocultar traducciones' : 'Mostrar traducciones'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Transcript List */}
            <div 
              ref={transcriptContainerRef}
              className="space-y-3 max-h-[600px] overflow-y-auto pr-1 transcript-scroll"
            >
              {!hasRealSegments ? (
                <div 
                  className="p-8 bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl text-center space-y-4 my-2 transition-colors hover:border-indigo-400"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const content = ev.target?.result as string;
                        if (!content) return;
                        const detection = autoDetectAndParseTranscript(content, duration || item.audioDuration);
                        if (detection.segments.length > 0) {
                          const updated = { ...item, segments: detection.segments };
                          if (onUpdateItem) onUpdateItem(updated);
                          playerEngine.loadTrack(updated, audioBlobUrl);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      No aparece la transcripción .VTT para este audio
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Para que el texto aparezca y se sincronice frase a frase con las marcas de tiempo exactas del audio, sube tu archivo <strong>.vtt</strong> o pega su contenido aquí.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      onClick={() => setIsVttModalOpen(true)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all transform active:scale-95"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Subir o Pegar Archivo .VTT</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    También puedes arrastrar y soltar el archivo .vtt directamente sobre este recuadro.
                  </p>
                </div>
              ) : (
                item.segments.map((seg, idx) => {
                const isActive = activeSegment?.id === seg.id;
                const words = seg.text.split(/\s+/);
                
                // Calculate sentence-internal progress
                const segDuration = Math.max(0.1, seg.endTime - seg.startTime);
                const segElapsed = Math.max(0, Math.min(currentTime - seg.startTime, segDuration));
                const segProgressPercent = isActive ? (segElapsed / segDuration) * 100 : 0;
                
                // Approximate active word index in sentence
                const activeWordIndex = isActive 
                  ? Math.floor((segElapsed / segDuration) * words.length) 
                  : -1;

                return (
                  <div
                    key={seg.id}
                    ref={(el) => {
                      if (el) segmentRefs.current.set(seg.id, el);
                      else segmentRefs.current.delete(seg.id);
                    }}
                    className={`relative p-4 sm:p-5 rounded-xl transition-all duration-200 border overflow-hidden ${
                      isActive
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Live Sentence Progress Indicator Bar */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 dark:bg-indigo-900/60 overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-75"
                          style={{ width: `${segProgressPercent}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3 mb-2">
                      {/* Timestamp, Speaker Tag & Live Playing Badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleJumpToSegment(seg)}
                          className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{formatTime(seg.startTime)}</span>
                        </button>

                        {seg.speaker && (
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {seg.speaker}:
                          </span>
                        )}

                        {isActive && isPlaying && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Reproduciendo ahora ({formatTime(currentTime, true)})</span>
                          </span>
                        )}
                      </div>

                      {/* Line Loop quick button */}
                      <button
                        onClick={() => {
                          handleJumpToSegment(seg);
                          setIsLoopingSegment(true);
                          playerEngine.setLoopSegment(seg);
                        }}
                        title="Repetir solo esta frase"
                        className={`text-xs p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                          isLoopingSegment && activeSegment?.id === seg.id
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold hidden sm:inline">
                          {isLoopingSegment && activeSegment?.id === seg.id ? 'Repitiendo' : 'Bucle'}
                        </span>
                      </button>
                    </div>

                    {/* Interactive English Sentence Text with word highlight */}
                    <p className="text-base sm:text-lg leading-relaxed text-slate-900 dark:text-slate-100 font-normal">
                      {words.map((w, wIdx) => {
                        const isCurrentSpokenWord = isActive && wIdx === activeWordIndex;
                        return (
                          <span
                            key={wIdx}
                            onClick={() => handleWordClick(w)}
                            className={`rounded px-1 py-0.5 cursor-pointer transition-all inline-block ${
                              isCurrentSpokenWord
                                ? 'bg-indigo-600 text-white font-semibold scale-105 shadow-xs'
                                : 'hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:text-indigo-900 dark:hover:text-indigo-200'
                            }`}
                          >
                            {w}{' '}
                          </span>
                        );
                      })}
                    </p>

                    {/* Spanish Translation */}
                    {showTranslations && seg.translation && (
                      <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 leading-relaxed font-light">
                        {seg.translation}
                      </p>
                    )}
                  </div>
                );
              }))}
            </div>
          </div>

          {/* Word Inspector Sidebar (1 Column) */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Inspector de Vocabulario
                </span>
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>

              {isLookingUp ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Consultando diccionario y fonética...
                </div>
              ) : inspectedWord ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                        {inspectedWord.word}
                      </h3>
                      <button
                        onClick={() => playWordSpeech(inspectedWord.word, item.accent === 'UK' ? 'UK' : 'US')}
                        title="Escuchar pronunciación"
                        className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer"
                      >
                        <Volume1 className="w-4 h-4" />
                      </button>
                    </div>

                    {inspectedWord.phonetic && (
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        {inspectedWord.phonetic}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Traducción al español:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                        {inspectedWord.spanish}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Definición en inglés:</span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {inspectedWord.definition}
                      </p>
                    </div>

                    {inspectedWord.example && (
                      <div>
                        <span className="text-slate-400 block mb-0.5 font-medium">Ejemplo de uso:</span>
                        <p className="text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-md">
                          "{inspectedWord.example}"
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSaveInspectedWord}
                    className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {savedSuccessWord === inspectedWord.word ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Guardada en Mi Vocabulario!</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-4 h-4" />
                        <span>Guardar en Mi Vocabulario</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Languages className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Haz clic en cualquier palabra de la transcripción para ver su pronunciación en alfabeto fonético (IPA), significado y traducción al español.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dictation Mode */}
      {activeTab === 'dictation' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Entrenamiento de Dictado
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Escucha el fragmento de audio tantas veces como necesites y escribe la oración que escuchas para afinar tu oído.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {item.segments.map((seg, idx) => {
                const isCorrect = dictationFeedback[seg.id];

                return (
                  <div key={seg.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Oración {idx + 1} de {item.segments.length}
                      </span>
                      <button
                        onClick={() => handleJumpToSegment(seg)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 rounded-md hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Escuchar oración</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                        Escribe lo que escuchas en inglés:
                      </label>
                      <input
                        type="text"
                        value={dictationAnswers[seg.id] || ''}
                        onChange={(e) => setDictationAnswers(prev => ({ ...prev, [seg.id]: e.target.value }))}
                        placeholder="Escribe la frase aquí..."
                        className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleCheckDictation(seg.id, seg.text)}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-md hover:bg-slate-800 cursor-pointer"
                      >
                        Comprobar
                      </button>

                      {isCorrect === true && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          ¡Excelente! Coincidencia exacta.
                        </span>
                      )}

                      {isCorrect === false && (
                        <div className="text-right">
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium block">
                            Revisa con atención:
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                            {seg.text}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shadowing & Voice Practice Mode */}
      {activeTab === 'shadowing' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Técnica de Shadowing (Eco del Habla)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                El shadowing consiste en repetir en voz alta la frase nativa imitando el ritmo, pausas y entonación. Grábate y compárate directamente con el audio original.
              </p>
            </div>

            {/* Currently targeted sentence for shadowing */}
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2">
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Oración seleccionada para repetir:
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {activeSegment ? activeSegment.text : item.segments[0]?.text}
              </p>
              {showTranslations && (activeSegment?.translation || item.segments[0]?.translation) && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeSegment ? activeSegment.translation : item.segments[0]?.translation}
                </p>
              )}
            </div>

            {/* Dual Audio Listeners: Native vs User Recording */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  1. Audio Nativo
                </span>
                <button
                  onClick={() => {
                    const seg = activeSegment || item.segments[0];
                    if (seg) handleJumpToSegment(seg);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Escuchar Frase Nativa</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  2. Tu Grabación de Voz
                </span>
                {isRecording ? (
                  <button
                    onClick={handleStopRecording}
                    className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer inline-flex items-center gap-1.5 animate-pulse"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Detener Grabación</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartRecording}
                    className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Grabar mi voz</span>
                  </button>
                )}

                {recordedAudioUrl && !isRecording && (
                  <div className="pt-2">
                    <audio src={recordedAudioUrl} controls className="w-full h-8" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VTT Transcript Attachment Modal */}
      {isVttModalOpen && (
        <VTTAttachModal
          audioTitle={item.title}
          audioDuration={duration || item.audioDuration}
          currentSegmentsCount={hasRealSegments ? item.segments.length : 0}
          onClose={() => setIsVttModalOpen(false)}
          onSaveSegments={(newSegments) => {
            const updatedItem: AudioTranscriptItem = {
              ...item,
              segments: newSegments,
              tags: Array.from(new Set([...item.tags, 'VTT Sincronizado'])),
            };
            if (onUpdateItem) {
              onUpdateItem(updatedItem);
            }
            playerEngine.loadTrack(updatedItem, audioBlobUrl);
          }}
        />
      )}
    </div>
  );
};
