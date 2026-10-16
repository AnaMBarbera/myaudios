import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileAudio, 
  FileText, 
  Link2, 
  Play, 
  Pause, 
  Check, 
  Plus, 
  Trash2, 
  Clock, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { AudioTranscriptItem, CefrLevel, Category, Accent, TranscriptSegment } from '../types';
import { parseSRT, parseVTT, parsePlainText, formatTime } from '../utils/transcriptParser';

interface AudioTranscriptPairingModalProps {
  initialItem?: AudioTranscriptItem | null;
  onSave: (newItem: AudioTranscriptItem, audioBlob?: Blob) => void;
  onClose: () => void;
  existingItems: AudioTranscriptItem[];
}

export const AudioTranscriptPairingModal: React.FC<AudioTranscriptPairingModalProps> = ({
  initialItem,
  onSave,
  onClose,
  existingItems,
}) => {
  // Step 1: Audio selection / upload
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialItem?.audioUrl || null);
  const [audioDuration, setAudioDuration] = useState<number>(initialItem?.audioDuration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Metadata
  const [title, setTitle] = useState<string>(initialItem?.title || '');
  const [description, setDescription] = useState<string>(initialItem?.description || '');
  const [level, setLevel] = useState<CefrLevel>(initialItem?.level || 'B1');
  const [category, setCategory] = useState<Category>(initialItem?.category || 'conversation');
  const [accent, setAccent] = useState<Accent>(initialItem?.accent || 'US');
  const [tagsInput, setTagsInput] = useState<string>(initialItem?.tags?.join(', ') || '');

  // Step 2: Transcript source
  const [rawText, setRawText] = useState<string>('');
  const [transcriptType, setTranscriptType] = useState<'upload' | 'paste' | 'existing'>('paste');
  const [segments, setSegments] = useState<TranscriptSegment[]>(initialItem?.segments || []);

  // Step 3: Live Tap-to-Sync Alignment
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [currentSyncAudioTime, setCurrentSyncAudioTime] = useState<number>(0);
  const [syncingSentenceIdx, setSyncingSentenceIdx] = useState<number>(0);

  // Handle audio file input
  const handleAudioFileInput = (file: File) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    // Read audio duration
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      if (tempAudio.duration && !isNaN(tempAudio.duration)) {
        setAudioDuration(tempAudio.duration);
      }
    };
  };

  // Handle transcript file upload
  const handleTranscriptFileInput = (file: File) => {
    const reader = new FileReader();
    const ext = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      if (ext === 'srt') {
        const parsed = parseSRT(content);
        setSegments(parsed);
      } else if (ext === 'vtt') {
        const parsed = parseVTT(content);
        setSegments(parsed);
      } else {
        // Plain text
        setRawText(content);
        const parsed = parsePlainText(content, audioDuration || 30);
        setSegments(parsed);
      }
    };
    reader.readAsText(file);
  };

  // Auto-generate segments from raw text
  const handleGenerateSegmentsFromText = () => {
    if (!rawText.trim()) return;
    const parsed = parsePlainText(rawText, audioDuration || 30);
    setSegments(parsed);
    setSyncingSentenceIdx(0);
  };

  // Live tap-to-sync alignment logic
  const handleMarkCurrentTimestamp = () => {
    if (!audioRef.current || segments.length === 0) return;
    const curTime = audioRef.current.currentTime;

    if (syncingSentenceIdx < segments.length) {
      setSegments(prev => {
        const copy = [...prev];
        const seg = { ...copy[syncingSentenceIdx] };
        seg.startTime = Number(curTime.toFixed(2));
        
        // Adjust previous sentence's endTime
        if (syncingSentenceIdx > 0) {
          copy[syncingSentenceIdx - 1].endTime = Number(curTime.toFixed(2));
        }

        // Default end time for current
        seg.endTime = Number(Math.min(audioDuration || curTime + 5, curTime + 4).toFixed(2));
        copy[syncingSentenceIdx] = seg;
        return copy;
      });

      setSyncingSentenceIdx(prev => Math.min(prev + 1, segments.length));
    }
  };

  // Play / Pause in sync tool
  const togglePlaySyncAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Handle save
  const handleFinalSave = () => {
    if (!title.trim()) {
      alert('Por favor introduce un título para la pista.');
      return;
    }

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const newItem: AudioTranscriptItem = {
      id: initialItem?.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      category,
      level,
      accent,
      audioDuration: audioDuration || 30,
      audioFileName: audioFile?.name || initialItem?.audioFileName,
      audioFileSize: audioFile?.size || initialItem?.audioFileSize,
      audioUrl: audioUrl || undefined,
      audioBlobId: initialItem?.audioBlobId || `blob_${Date.now()}`,
      segments: segments.length > 0 ? segments : [
        {
          id: `seg_${Date.now()}`,
          startTime: 0,
          endTime: audioDuration || 30,
          text: rawText || 'Audio sin transcripción específica',
        }
      ],
      createdAt: initialItem?.createdAt || Date.now(),
      tags: tags.length > 0 ? tags : ['Inglés'],
    };

    onSave(newItem, audioFile || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Link2 className="w-4 h-4" />
              <span>Estudio de Emparejamiento & Sincronización</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Asociar Audio con Transcripción
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Select Audio */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Paso 1: Archivo de Audio en Inglés
          </label>
          
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center hover:border-indigo-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
            {audioUrl ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      {audioFile ? audioFile.name : initialItem?.audioFileName || 'Pista de Audio Cargada'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Duración: {formatTime(audioDuration)}
                    </span>
                  </div>
                </div>

                <label className="px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-md cursor-pointer transition-colors">
                  Cambiar archivo
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                    onChange={(e) => e.target.files?.[0] && handleAudioFileInput(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div>
                <FileAudio className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Arrastra o selecciona tu archivo de audio
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Compatible con MP3, WAV, M4A, AAC, OGG o WEBM
                </p>
                <label className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer inline-block transition-colors">
                  Examinar archivos
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                    onChange={(e) => e.target.files?.[0] && handleAudioFileInput(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Transcript */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Paso 2: Transcripción / Subtítulos
            </label>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setTranscriptType('paste')}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                  transcriptType === 'paste'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pegar Texto
              </button>
              <button
                onClick={() => setTranscriptType('upload')}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                  transcriptType === 'upload'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Subir SRT / VTT
              </button>
            </div>
          </div>

          {transcriptType === 'upload' ? (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50 dark:bg-slate-800/40">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Subir archivo con marcas de tiempo (.srt o .vtt)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Los tiempos de inicio y fin de cada frase se cargarán automáticamente.
              </p>
              <label className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg cursor-pointer inline-block">
                Seleccionar archivo .SRT o .VTT
                <input
                  type="file"
                  accept=".srt,.vtt,.txt"
                  onChange={(e) => e.target.files?.[0] && handleTranscriptFileInput(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={4}
                placeholder="Pega aquí el texto completo o diálogo en inglés. Puedes incluir hablantes al inicio (ej: Host: Hello! Guest: Hi!)..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Se dividirá automáticamente por oraciones para sincronizar.
                </span>
                <button
                  onClick={handleGenerateSegmentsFromText}
                  disabled={!rawText.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-lg hover:bg-indigo-100 cursor-pointer disabled:opacity-50"
                >
                  Convertir en Oraciones ({segments.length} generadas)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Interactive Alignment / Segment Preview */}
        {segments.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Paso 3: Sincronización en Vivo (Tap-to-Sync)
                </label>
                <p className="text-[11px] text-slate-500">
                  Reproduce el audio y pulsa "Marcar inicio de frase" cuando empiece a sonar.
                </p>
              </div>

              {audioUrl && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlaySyncAudio}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center gap-1.5"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlayingAudio ? 'Pausar' : 'Reproducir Audio'}</span>
                  </button>

                  <button
                    onClick={handleMarkCurrentTimestamp}
                    className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs animate-pulse"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Marcar Frase Actual #{syncingSentenceIdx + 1}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden audio element for sync tool */}
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={() => {
                  if (audioRef.current) setCurrentSyncAudioTime(audioRef.current.currentTime);
                }}
                onEnded={() => setIsPlayingAudio(false)}
                className="hidden"
              />
            )}

            {/* Segments table preview */}
            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40 transcript-scroll text-xs">
              {segments.map((seg, idx) => {
                const isCurrentSync = idx === syncingSentenceIdx;
                return (
                  <div
                    key={seg.id || idx}
                    className={`flex items-center justify-between gap-3 p-2 rounded-lg border ${
                      isCurrentSync
                        ? 'bg-indigo-100/60 dark:bg-indigo-950/60 border-indigo-400 font-medium'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                        {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                      </span>
                      {seg.speaker && (
                        <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          {seg.speaker}:
                        </span>
                      )}
                      <span className="text-slate-800 dark:text-slate-200 truncate">
                        {seg.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.currentTime = seg.startTime;
                            audioRef.current.play();
                            setIsPlayingAudio(true);
                          }
                        }}
                        title="Probar audio de este punto"
                        className="p-1 hover:text-indigo-600 cursor-pointer text-slate-400"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        onClick={() => {
                          setSegments(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1 hover:text-red-600 cursor-pointer text-slate-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Título de la lección / audio:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: English Job Interview Practice"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Nivel de dificultad (MCER):
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as CefrLevel)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer"
            >
              <option value="A1">A1 - Principiante</option>
              <option value="A2">A2 - Elemental</option>
              <option value="B1">B1 - Intermedio</option>
              <option value="B2">B2 - Intermedio Alto</option>
              <option value="C1">C1 - Avanzado</option>
              <option value="C2">C2 - Maestría</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Categoría temática:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer"
            >
              <option value="conversation">Conversación Cotidiana</option>
              <option value="business">Negocios / Profesional</option>
              <option value="travel">Viajes & Aeropuertos</option>
              <option value="academic">Académico / Conferencias</option>
              <option value="news">Noticias & Medios</option>
              <option value="pronunciation">Pronunciación / Fonética</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Variedad / Acento:
            </label>
            <select
              value={accent}
              onChange={(e) => setAccent(e.target.value as Accent)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer"
            >
              <option value="US">Inglés Americano (US)</option>
              <option value="UK">Inglés Británico (UK)</option>
              <option value="AU">Inglés Australiano (AU)</option>
              <option value="International">Internacional</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleFinalSave}
            className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Guardar en mi Biblioteca</span>
          </button>
        </div>

      </div>
    </div>
  );
};
