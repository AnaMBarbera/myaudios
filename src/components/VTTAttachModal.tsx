import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Check, 
  Clock, 
  ListFilter 
} from 'lucide-react';
import { TranscriptSegment } from '../types';
import { autoDetectAndParseTranscript, formatTime } from '../utils/transcriptParser';

interface VTTAttachModalProps {
  audioTitle: string;
  audioDuration?: number;
  currentSegmentsCount?: number;
  onClose: () => void;
  onSaveSegments: (segments: TranscriptSegment[]) => void;
}

export const VTTAttachModal: React.FC<VTTAttachModalProps> = ({
  audioTitle,
  audioDuration = 30,
  currentSegmentsCount = 0,
  onClose,
  onSaveSegments,
}) => {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [detectedFormat, setDetectedFormat] = useState<'vtt' | 'srt' | 'plain' | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCuesPreview, setShowCuesPreview] = useState<boolean>(true);

  // File upload handler
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const detection = autoDetectAndParseTranscript(content, audioDuration);
      setSegments(detection.segments);
      setDetectedFormat(detection.format);
      setPastedText(content);

      if (detection.segments.length === 0) {
        setErrorMsg('No se detectaron marcas de tiempo en el archivo. Asegúrate de que sea un archivo .vtt válido.');
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error al leer el archivo. Prueba a copiar y pegar su contenido en la pestaña "Pegar Texto".');
    };

    reader.readAsText(file);
  };

  // Real-time paste handler
  const handlePasteChange = (text: string) => {
    setPastedText(text);
    setErrorMsg(null);

    if (!text.trim()) {
      setSegments([]);
      setDetectedFormat(null);
      return;
    }

    const detection = autoDetectAndParseTranscript(text, audioDuration);
    setSegments(detection.segments);
    setDetectedFormat(detection.format);
  };

  const handleSave = () => {
    let finalSegments = segments;
    if (finalSegments.length === 0 && pastedText.trim()) {
      const detection = autoDetectAndParseTranscript(pastedText, audioDuration);
      finalSegments = detection.segments;
    }

    if (finalSegments.length === 0) {
      setErrorMsg('Debes subir un archivo .vtt o pegar un texto de transcripción con marcas de tiempo.');
      return;
    }

    onSaveSegments(finalSegments);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-6 max-h-[92vh] overflow-y-auto transcript-scroll">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Vincular Transcripción .VTT
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                Audio: <strong>{audioTitle}</strong> ({currentSegmentsCount} marcas actuales)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'upload'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Archivo .VTT</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('paste')}
            className={`flex-1 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'paste'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pegar Texto .VTT</span>
          </button>
        </div>

        {/* Mode A: Upload .VTT File */}
        {tab === 'upload' && (
          <div className="space-y-3">
            <label
              className="border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/70 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
            >
              <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2" />
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {fileName ? `Archivo: ${fileName}` : 'Haz clic o arrastra tu archivo .vtt aquí'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Acepta archivos WebVTT (.vtt) o SubRip (.srt)
              </span>
              <input
                type="file"
                accept=".vtt,.srt,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Mode B: Paste text */}
        {tab === 'paste' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Pega el contenido completo del archivo .vtt:
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              rows={6}
              placeholder={`WEBVTT\n\n00:00:01.000 --> 00:00:04.500\nHello, welcome to this English lesson.\n\n00:00:05.000 --> 00:00:09.000\nToday we will practice listening comprehension.`}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100"
            />
            <span className="text-[11px] text-slate-500 block">
              Detección en tiempo real: se detectan automáticamente las marcas de tiempo según vayas pegando.
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 rounded-xl border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success / Detected cues badge */}
        {segments.length > 0 && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  🎯 {segments.length} marcas de tiempo detectadas ({detectedFormat?.toUpperCase() || 'VTT'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCuesPreview(!showCuesPreview)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>{showCuesPreview ? 'Ocultar vista previa' : 'Ver vista previa'}</span>
              </button>
            </div>

            {/* Cues preview list */}
            {showCuesPreview && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 mt-2 text-xs">
                {segments.map((seg, idx) => (
                  <div 
                    key={seg.id || idx}
                    className="p-2 bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/60 rounded-lg flex items-start gap-2 text-[11px]"
                  >
                    <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold shrink-0">
                      {formatTime(seg.startTime)} &rarr; {formatTime(seg.endTime)}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 flex-1 line-clamp-1">
                      {seg.speaker ? <strong>{seg.speaker}: </strong> : null}
                      {seg.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={segments.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Sincronizar y Guardar Transcripción</span>
          </button>
        </div>

      </div>
    </div>
  );
};
