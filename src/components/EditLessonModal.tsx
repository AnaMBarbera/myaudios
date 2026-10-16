import React, { useState } from 'react';
import { X, BookOpen, Check, Eye, EyeOff, Trash2 } from 'lucide-react';
import { CourseLevel, CourseLesson } from '../types';

interface EditLessonModalProps {
  lesson: CourseLesson;
  levels: CourseLevel[];
  onClose: () => void;
  onSave: (updatedLesson: CourseLesson) => void;
  onDelete?: (lessonId: string) => void;
  onToggleHide?: (lessonId: string) => void;
}

export const EditLessonModal: React.FC<EditLessonModalProps> = ({
  lesson,
  levels,
  onClose,
  onSave,
  onDelete,
  onToggleHide,
}) => {
  const [title, setTitle] = useState(lesson.title);
  const [subtitle, setSubtitle] = useState(lesson.subtitle || '');
  const [levelId, setLevelId] = useState(lesson.levelId);
  const [isHidden, setIsHidden] = useState(Boolean(lesson.isHidden));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...lesson,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      levelId,
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
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Editar Lección
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Modifica el título, tema, nivel de curso o visibilidad
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
              Título de la Lección:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Lección 1, Unidad 2..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-900 dark:text-slate-100"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Subtítulo o Tema (opcional):
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ej: Conversación en el restaurante y reservas"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nivel de Inglés al que pertenece:
            </label>
            <select
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium cursor-pointer"
            >
              {levels.map(lvl => (
                <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
              ))}
            </select>
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
                  {isHidden ? 'Lección Oculta' : 'Lección Visible'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {isHidden
                    ? 'No se mostrará en los menús habituales salvo si activas "Ver ocultos".'
                    : 'Visible normalmente en los menús y cursos.'}
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
              {isHidden ? 'Desocultar' : 'Ocultar Lección'}
            </button>
          </div>

          {/* Actions & Delete */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(lesson.id);
                  onClose();
                }}
                className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Lección</span>
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
    </div>
  );
};
