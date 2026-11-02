import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Clock,
  Plus,
  Trash2,
  Check,
  Search,
  RotateCcw,
  Sparkles,
  Link,
  Split,
  ChevronDown,
  ChevronUp,
  Volume2,
  FileText,
  Save,
  ArrowRight,
  BookOpen,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';
import { TranscriptSegment, AudioTranscriptItem } from '../types';
import { 
  formatTime, 
  parseTimestampToSeconds,
  groupSegmentsIntoParagraphs,
  splitSegmentIntoSentences
} from '../utils/transcriptParser';

interface TranscriptSegmentEditorModalProps {
  item: AudioTranscriptItem;
  audioBlobUrl: string | null;
  onClose: () => void;
  onSave: (updatedSegments: TranscriptSegment[]) => void;
}

export const TranscriptSegmentEditorModal: React.FC<TranscriptSegmentEditorModalProps> = ({
  item,
  audioBlobUrl,
  onClose,
  onSave,
}) => {
  // Deep clone initial segments so edits are isolated until saved
  const [segments, setSegments] = useState<TranscriptSegment[]>(() => {
    return (item.segments || []).map(seg => ({ ...seg }));
  });

  const [activeSegId, setActiveSegId] = useState<string | null>(segments[0]?.id || null);
  const [selectedSegIds, setSelectedSegIds] = useState<Set<string>>(new Set());
  const [showGroupMenu, setShowGroupMenu] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.audioDuration || 0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  // Audio source resolution
  const resolvedAudioSrc = audioBlobUrl || item.audioUrl || '';

  // Handle audio time updates
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.warn);
      setIsPlaying(true);
    }
  };

  // Audition a specific segment
  const handlePreviewSegment = (seg: TranscriptSegment) => {
    if (!audioRef.current) return;
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    audioRef.current.currentTime = Math.max(0, seg.startTime);
    audioRef.current.play().catch(console.warn);
    setIsPlaying(true);
    setActiveSegId(seg.id);

    const segDurationMs = Math.max(0.5, seg.endTime - seg.startTime) * 1000;
    previewTimerRef.current = window.setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }, segDurationMs + 200);
  };

  // Jump audio to specific time
  const seekAudio = (seconds: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration || 999999));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Set the start time of the selected segment to the current playback time
  const handleSetStartTimeToCurrent = (segId: string) => {
    if (!audioRef.current) return;
    const now = Number(audioRef.current.currentTime.toFixed(2));
    setSegments(prev =>
      prev.map(s => {
        if (s.id !== segId) return s;
        const newEndTime = Math.max(now + 0.5, s.endTime);
        return { ...s, startTime: now, endTime: newEndTime };
      })
    );
  };

  // Set the end time of the selected segment to the current playback time
  const handleSetEndTimeToCurrent = (segId: string) => {
    if (!audioRef.current) return;
    const now = Number(audioRef.current.currentTime.toFixed(2));
    setSegments(prev =>
      prev.map(s => {
        if (s.id !== segId) return s;
        const newEndTime = Math.max(s.startTime + 0.2, now);
        return { ...s, endTime: newEndTime };
      })
    );
  };

  // Nudge start or end time by delta (+0.5, -0.5, etc.)
  const handleNudgeTime = (segId: string, field: 'startTime' | 'endTime', delta: number) => {
    setSegments(prev =>
      prev.map(s => {
        if (s.id !== segId) return s;
        if (field === 'startTime') {
          const newStart = Math.max(0, Number((s.startTime + delta).toFixed(2)));
          const newEnd = Math.max(newStart + 0.2, s.endTime);
          return { ...s, startTime: newStart, endTime: newEnd };
        } else {
          const newEnd = Math.max(s.startTime + 0.2, Number((s.endTime + delta).toFixed(2)));
          return { ...s, endTime: newEnd };
        }
      })
    );
  };

  // Update text of a segment
  const handleTextChange = (segId: string, newText: string) => {
    setSegments(prev =>
      prev.map(s => (s.id === segId ? { ...s, text: newText } : s))
    );
  };

  // Update speaker
  const handleSpeakerChange = (segId: string, speaker: string) => {
    setSegments(prev =>
      prev.map(s => (s.id === segId ? { ...s, speaker: speaker.trim() || undefined } : s))
    );
  };

  // Update Spanish translation
  const handleTranslationChange = (segId: string, translation: string) => {
    setSegments(prev =>
      prev.map(s => (s.id === segId ? { ...s, translation: translation.trim() || undefined } : s))
    );
  };

  // Insert a new segment immediately after the given index
  const handleInsertSegmentAfter = (idx: number) => {
    const current = segments[idx];
    const next = segments[idx + 1];

    let newStart = 0;
    let newEnd = 4;

    if (current) {
      newStart = Number((current.endTime).toFixed(2));
      if (next && next.startTime > current.endTime) {
        newEnd = Number(next.startTime.toFixed(2));
      } else {
        newEnd = Number((newStart + 3.5).toFixed(2));
      }
    }

    const newSeg: TranscriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: newStart,
      endTime: Math.max(newStart + 0.5, newEnd),
      text: 'New phrase / sentence',
      speaker: current?.speaker,
    };

    const copy = [...segments];
    copy.splice(idx + 1, 0, newSeg);
    setSegments(copy);
    setActiveSegId(newSeg.id);
  };

  // Insert segment at the very beginning
  const handleInsertAtBeginning = () => {
    const first = segments[0];
    const newEnd = first ? Math.max(1, first.startTime) : 4;
    const newSeg: TranscriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: 0,
      endTime: Number(newEnd.toFixed(2)),
      text: 'Introduction or opening phrase',
    };

    setSegments([newSeg, ...segments]);
    setActiveSegId(newSeg.id);
  };

  // Insert segment at the end
  const handleInsertAtEnd = () => {
    const last = segments[segments.length - 1];
    const newStart = last ? Number(last.endTime.toFixed(2)) : 0;
    const newEnd = duration > newStart ? Number(duration.toFixed(2)) : Number((newStart + 4).toFixed(2));

    const newSeg: TranscriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: newStart,
      endTime: Math.max(newStart + 0.5, newEnd),
      text: 'New closing sentence or phrase',
    };

    setSegments([...segments, newSeg]);
    setActiveSegId(newSeg.id);
  };

  // Merge segment with the next one
  const handleMergeWithNext = (idx: number) => {
    if (idx >= segments.length - 1) return;
    const cur = segments[idx];
    const next = segments[idx + 1];

    const merged: TranscriptSegment = {
      ...cur,
      endTime: next.endTime,
      text: `${cur.text.trim()} ${next.text.trim()}`,
      translation: cur.translation && next.translation
        ? `${cur.translation.trim()} ${next.translation.trim()}`
        : cur.translation || next.translation,
    };

    const copy = [...segments];
    copy.splice(idx, 2, merged);
    setSegments(copy);
    setActiveSegId(merged.id);
  };

  // Split a segment into two equal parts or at the cursor/midpoint
  const handleSplitSegment = (idx: number) => {
    const cur = segments[idx];
    if (!cur || !cur.text) return;

    const words = cur.text.trim().split(/\s+/);
    if (words.length <= 1) return;

    const midIdx = Math.ceil(words.length / 2);
    const text1 = words.slice(0, midIdx).join(' ');
    const text2 = words.slice(midIdx).join(' ');

    const totalDur = cur.endTime - cur.startTime;
    const midTime = Number((cur.startTime + totalDur / 2).toFixed(2));

    const seg1: TranscriptSegment = {
      ...cur,
      endTime: midTime,
      text: text1,
    };

    const seg2: TranscriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: midTime,
      endTime: cur.endTime,
      text: text2,
      speaker: cur.speaker,
    };

    const copy = [...segments];
    copy.splice(idx, 1, seg1, seg2);
    setSegments(copy);
    setActiveSegId(seg2.id);
  };

  // Delete segment
  const handleDeleteSegment = (segId: string) => {
    setSegments(prev => prev.filter(s => s.id !== segId));
    setSelectedSegIds(prev => {
      const copy = new Set(prev);
      copy.delete(segId);
      return copy;
    });
  };

  // Sort segments by startTime chronologically
  const handleSortChronologically = () => {
    setSegments(prev => [...prev].sort((a, b) => a.startTime - b.startTime));
  };

  // Group all segments into paragraphs of N sentences
  const handleGroupAllIntoParagraphs = (groupSize: number) => {
    if (segments.length <= 1) return;
    const grouped = groupSegmentsIntoParagraphs(segments, groupSize);
    setSegments(grouped);
    setSelectedSegIds(new Set());
    setActiveSegId(grouped[0]?.id || null);
    setShowGroupMenu(false);
  };

  // Toggle selection for bulk actions
  const handleToggleSelect = (segId: string) => {
    setSelectedSegIds(prev => {
      const next = new Set(prev);
      if (next.has(segId)) next.delete(segId);
      else next.add(segId);
      return next;
    });
  };

  // Merge currently selected segments into a single cohesive paragraph
  const handleMergeSelected = () => {
    if (selectedSegIds.size < 2) return;

    // Get selected segments in chronological order
    const toMerge = segments
      .filter(s => selectedSegIds.has(s.id))
      .sort((a, b) => a.startTime - b.startTime);

    if (toMerge.length < 2) return;

    const first = toMerge[0];
    const last = toMerge[toMerge.length - 1];
    const mergedText = toMerge.map(s => s.text.trim()).join(' ');
    const mergedTrans = toMerge.map(s => s.translation?.trim()).filter(Boolean).join(' ');

    const mergedSegment: TranscriptSegment = {
      id: `para_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: first.startTime,
      endTime: Math.max(first.startTime + 0.5, last.endTime),
      speaker: first.speaker,
      text: mergedText,
      translation: mergedTrans || undefined,
    };

    // Replace the first merged item in original list with the merged segment and remove other selected
    let placed = false;
    const nextSegments: TranscriptSegment[] = [];

    for (const s of segments) {
      if (selectedSegIds.has(s.id)) {
        if (!placed) {
          nextSegments.push(mergedSegment);
          placed = true;
        }
      } else {
        nextSegments.push(s);
      }
    }

    setSegments(nextSegments);
    setSelectedSegIds(new Set());
    setActiveSegId(mergedSegment.id);
  };

  // Split a paragraph segment back into individual sentences
  const handleSplitParagraphToSentences = (idx: number) => {
    const cur = segments[idx];
    if (!cur) return;

    const sentences = splitSegmentIntoSentences(cur);
    if (sentences.length <= 1) return;

    const copy = [...segments];
    copy.splice(idx, 1, ...sentences);
    setSegments(copy);
    setActiveSegId(sentences[0]?.id || null);
  };

  // Save all changes
  const handleSave = () => {
    // Sanitize and ensure chronological order
    const cleaned = segments
      .map((s, idx) => ({
        ...s,
        id: s.id || `seg_${Date.now()}_${idx}`,
        text: s.text.trim(),
        startTime: Number(Number(s.startTime).toFixed(2)),
        endTime: Math.max(Number((s.startTime + 0.1).toFixed(2)), Number(Number(s.endTime).toFixed(2))),
      }))
      .filter(s => s.text.length > 0)
      .sort((a, b) => a.startTime - b.startTime);

    onSave(cleaned);
    onClose();
  };

  // Filter segments by search query
  const filteredSegments = segments.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.text.toLowerCase().includes(q) || (s.speaker && s.speaker.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-4">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <FileText className="w-4 h-4" />
              <span>Editor de Transcripción & Tiempos</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {item.title}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{segments.length} frases</span>
              <span>·</span>
              <span>Duración: {formatTime(duration || item.audioDuration || 0)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audio Player Strip (Sticky Controller) */}
        {resolvedAudioSrc && (
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 shrink-0">
            <audio
              ref={audioRef}
              src={resolvedAudioSrc}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                </button>

                <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatTime(currentTime, true)} <span className="text-slate-400">/</span> {formatTime(duration)}
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => seekAudio(currentTime - 3)}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold cursor-pointer"
                    title="Retroceder 3 segundos"
                  >
                    -3s
                  </button>
                  <button
                    type="button"
                    onClick={() => seekAudio(currentTime + 3)}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold cursor-pointer"
                    title="Avanzar 3 segundos"
                  >
                    +3s
                  </button>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="flex-1 flex items-center gap-2 min-w-[140px]">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekAudio(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 rounded-lg bg-indigo-200 dark:bg-indigo-900"
                />
              </div>

              {/* Quick action: Sync active sentence start to current time */}
              {activeSegId && (
                <button
                  type="button"
                  onClick={() => handleSetStartTimeToCurrent(activeSegId)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                  title="Fija el inicio de la frase seleccionada en la posición actual del audio"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Fijar inicio en {formatTime(currentTime, true)}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toolbar: Search + Paragraph Tools + Quick Add buttons */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 bg-white dark:bg-slate-900">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar frase o palabra..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Merge Selected as 1 Paragraph (bulk action) */}
            {selectedSegIds.size >= 2 && (
              <button
                type="button"
                onClick={handleMergeSelected}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm cursor-pointer animate-pulse transition-all"
                title="Fusionar las frases seleccionadas en un único párrafo continuo"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Fusionar {selectedSegIds.size} en 1 Párrafo</span>
              </button>
            )}

            {/* Paragraph Grouping Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Agrupar frases consecutivas en párrafos completos para audiolibros"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📚 Agrupar en Párrafos</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {showGroupMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1.5 text-xs">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Agrupar para Audiolibro:
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGroupAllIntoParagraphs(2)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer text-slate-800 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>De 2 en 2 frases</span>
                    <span className="text-[10px] text-slate-400">Párrafos cortos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGroupAllIntoParagraphs(3)}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-between"
                  >
                    <span>De 3 en 3 frases ⭐</span>
                    <span className="text-[10px] text-indigo-500 font-normal">Recomendado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGroupAllIntoParagraphs(4)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer text-slate-800 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>De 4 en 4 frases</span>
                    <span className="text-[10px] text-slate-400">Párrafos estándar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGroupAllIntoParagraphs(5)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer text-slate-800 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>De 5 en 5 frases</span>
                    <span className="text-[10px] text-slate-400">Párrafos largos</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleInsertAtBeginning}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Inicio</span>
            </button>

            <button
              type="button"
              onClick={handleInsertAtEnd}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Final</span>
            </button>

            <button
              type="button"
              onClick={handleSortChronologically}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Ordenar frases cronológicamente por sus marcas de tiempo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ordenar</span>
            </button>
          </div>
        </div>

        {/* Scrollable Phrases Editor List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 transcript-scroll bg-slate-50/50 dark:bg-slate-900/50">
          {filteredSegments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              {searchQuery ? 'No se encontraron frases con esa búsqueda.' : 'No hay frases cargadas aún.'}
            </div>
          ) : (
            filteredSegments.map((seg) => {
              const originalIndex = segments.findIndex(s => s.id === seg.id);
              const isSelected = activeSegId === seg.id;

              return (
                <div
                  key={seg.id}
                  onClick={() => setActiveSegId(seg.id)}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800/90 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar of Segment Card: Timestamps + Nudge Controls + Quick Play */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                    
                    {/* Checkbox, Index, Paragraph Badge, and Timestamp Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Multi-select checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(seg.id);
                        }}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer p-0.5"
                        title={selectedSegIds.has(seg.id) ? "Deseleccionar" : "Seleccionar para fusionar"}
                      >
                        {selectedSegIds.has(seg.id) ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {originalIndex + 1}
                      </span>

                      {/* Paragraph vs Sentence Badge */}
                      {(() => {
                        const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
                        const isPara = wordCount >= 18 || (seg.text.match(/[.!?]/g) || []).length >= 2 || seg.id.startsWith('para_');
                        return isPara ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>Párrafo ({wordCount} pal.)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            Frase ({wordCount} pal.)
                          </span>
                        );
                      })()}

                      {/* Play this segment */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewSegment(seg);
                        }}
                        className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Escuchar esta frase o párrafo exacto"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Probar</span>
                      </button>

                      {/* Start Time Editor */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Inic:</span>
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          value={seg.startTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSegments(prev =>
                              prev.map(s => s.id === seg.id ? { ...s, startTime: val } : s)
                            );
                          }}
                          className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleNudgeTime(seg.id, 'startTime', -0.5)}
                          className="px-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-bold"
                          title="Restar 0.5s"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNudgeTime(seg.id, 'startTime', 0.5)}
                          className="px-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-bold"
                          title="Sumar 0.5s"
                        >
                          +
                        </button>
                      </div>

                      {/* End Time Editor */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Fin:</span>
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          value={seg.endTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSegments(prev =>
                              prev.map(s => s.id === seg.id ? { ...s, endTime: val } : s)
                            );
                          }}
                          className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleNudgeTime(seg.id, 'endTime', -0.5)}
                          className="px-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-bold"
                          title="Restar 0.5s"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNudgeTime(seg.id, 'endTime', 0.5)}
                          className="px-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-bold"
                          title="Sumar 0.5s"
                        >
                          +
                        </button>
                      </div>

                      {/* Duration label */}
                      <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                        ({(seg.endTime - seg.startTime).toFixed(1)}s)
                      </span>
                    </div>

                    {/* Operational Action Buttons (Merge, Split, Insert Below, Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetStartTimeToCurrent(seg.id)}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-800 text-slate-600 dark:text-slate-300 rounded font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                        title="Poner tiempo actual del audio como inicio de este bloque"
                      >
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span className="hidden md:inline">Iniciar en audio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInsertSegmentAfter(originalIndex)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                        title="Insertar un nuevo bloque justo debajo"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {originalIndex < segments.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMergeWithNext(originalIndex)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                          title="Unir con el siguiente bloque"
                        >
                          <Link className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* If this segment contains multiple sentences, allow splitting into sentences */}
                      {((seg.text.match(/[.!?]/g) || []).length >= 2 || seg.text.length > 100) ? (
                        <button
                          type="button"
                          onClick={() => handleSplitParagraphToSentences(originalIndex)}
                          className="px-2 py-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 rounded font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                          title="Desglosar este párrafo en oraciones individuales"
                        >
                          <Split className="w-3 h-3" />
                          <span className="hidden sm:inline">Desglosar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSplitSegment(originalIndex)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                          title="Dividir en dos partes iguales"
                        >
                          <Split className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSegment(seg.id)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 rounded cursor-pointer"
                        title="Eliminar este bloque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Textarea for Phrase / Paragraph Text */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={seg.speaker || ''}
                        onChange={(e) => handleSpeakerChange(seg.id, e.target.value)}
                        placeholder="Hablante (opcional: Narrator, John...)"
                        className="w-48 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
                      />
                    </div>

                    <textarea
                      value={seg.text}
                      onChange={(e) => handleTextChange(seg.id, e.target.value)}
                      rows={seg.text.length > 120 ? 4 : 2}
                      placeholder="Texto en inglés del párrafo o frase..."
                      className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 leading-relaxed font-normal"
                    />

                    {/* Optional translation */}
                    <input
                      type="text"
                      value={seg.translation || ''}
                      onChange={(e) => handleTranslationChange(seg.id, e.target.value)}
                      placeholder="Traducción al español (opcional)..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 italic"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total: <span className="font-bold text-slate-900 dark:text-white">{segments.length}</span> frases editables
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar y Aplicar Cambios</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
