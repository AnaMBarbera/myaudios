import React, { useState } from 'react';
import { X, Headphones, Check, Eye, EyeOff, Trash2, Folder, BookOpen, FileText } from 'lucide-react';
import { AudioTranscriptItem, CourseLevel, CourseLesson, CefrLevel, Accent, TranscriptSegment } from '../types';
import { VTTAttachModal } from './VTTAttachModal';

interface EditAudioModalProps {
  item: AudioTranscriptItem;
  levels: CourseLevel[];
  lessons: CourseLesson[];
  onClose: () => void;
  onSave: (updatedItem: AudioTranscriptItem) => void;
  onDelete?: (itemId: string) => void;
  onToggleHide?: (itemId: string) => void;
}

export const EditAudioModal: React.FC<EditAudioModalProps> = ({
  item,
  levels,
  lessons,
  onClose,
  onSave,
  onDelete,
  onToggleHide,
}) => {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [levelId, setLevelId] = useState(item.levelId || levels[0]?.id || 'ingles_b1');
  const [lessonId, setLessonId] = useState(item.lessonId || '');
  const [level, setLevel] = useState<CefrLevel>(item.level || 'B1');
  const [accent, setAccent] = useState<Accent>(item.accent || 'US');
  const [tagsInput, setTagsInput] = useState(item.tags.join(', '));
  const [isHidden, setIsHidden] = useState(Boolean(item.isHidden));
  const [segments, setSegments] = useState<TranscriptSegment[]>(item.segments || []);
  const [isVttModalOpen, setIsVttModalOpen] = useState<boolean>(false);

  // Available lessons for current level
  const currentLessons = lessons.filter(l => l.levelId === levelId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const updatedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onSave({
      ...item,
      title: title.trim(),
      description: description.trim() || undefined,
      levelId,
      lessonId: lessonId || undefined,
      level,
      accent,
      tags: updatedTags.length > 0 ? updatedTags : item.tags,
      segments,
      isHidden,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Editar Audio & Asignación
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Cambia el título, nivel, lección asignada o visibilidad
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Título del Audio:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Diálogo en la cafetería"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-900 dark:text-slate-100"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Descripción o Contexto:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve explicación de la situación o vocabulario clave..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Level and Lesson assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nivel de Inglés:
              </label>
              <select
                value={levelId}
                onChange={(e) => {
                  setLevelId(e.target.value);
                  const firstLesson = lessons.find(l => l.levelId === e.target.value);
                  setLessonId(firstLesson?.id || '');
                  const lvlObj = levels.find(l => l.id === e.target.value);
                  if (lvlObj?.name.includes('B2')) setLevel('B2');
                  else if (lvlObj?.name.includes('C1')) setLevel('C1');
                  else if (lvlObj?.name.includes('A2')) setLevel('A2');
                  else if (lvlObj?.name.includes('A1')) setLevel('A1');
                  else setLevel('B1');
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium cursor-pointer"
              >
                {levels.map(lvl => (
                  <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Lección asignada:
              </label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium cursor-pointer"
              >
                <option value="">(Sin lección asignada / General)</option>
                {currentLessons.map(les => (
                  <option key={les.id} value={les.id}>{les.title} {les.subtitle ? `- ${les.subtitle}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Accent and Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Acento:
              </label>
              <select
                value={accent}
                onChange={(e) => setAccent(e.target.value as Accent)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                <option value="US">Inglés Americano (US)</option>
                <option value="UK">Inglés Británico (UK)</option>
                <option value="AU">Inglés Australiano (AU)</option>
                <option value="International">Internacional</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Etiquetas (separadas por coma):
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ej: Restaurante, Viajes, B1"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* VTT Transcript Management Section */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                  Transcripción .VTT ({segments.length} marcas de tiempo)
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {segments.length > 0
                    ? `${segments.length} marcas exactas sincronizadas con el audio.`
                    : 'Sin transcripción .vtt vinculada a este audio.'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsVttModalOpen(true)}
              className="px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{segments.length > 0 ? 'Reemplazar .VTT' : '+ Cargar .VTT'}</span>
            </button>
          </div>

          {/* Visibility toggle (Ocultar / Mostrar) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isHidden ? (
                <EyeOff className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {isHidden ? 'Audio Oculto' : 'Audio Visible'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {isHidden
                    ? 'Oculto de las listas habituales a menos que actives "Ver ocultos".'
                    : 'Visible normalmente para reproducir y estudiar.'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHidden(!isHidden)}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                isHidden
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-300'
              }`}
            >
              {isHidden ? 'Desocultar' : 'Ocultar Audio'}
            </button>
          </div>

          {/* Actions & Delete */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(item.id);
                  onClose();
                }}
                className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Audio</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>

      </div>

      {isVttModalOpen && (
        <VTTAttachModal
          audioTitle={title || item.title}
          audioDuration={item.audioDuration}
          currentSegmentsCount={segments.length}
          onClose={() => setIsVttModalOpen(false)}
          onSaveSegments={(newSegments) => {
            setSegments(newSegments);
          }}
        />
      )}
    </div>
  );
};
