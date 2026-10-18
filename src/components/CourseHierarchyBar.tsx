import React, { useState } from 'react';
import { 
  ChevronRight, 
  Folder, 
  BookOpen, 
  Headphones, 
  Plus, 
  FolderSync, 
  Check, 
  ChevronDown,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { CourseLevel, CourseLesson, AudioTranscriptItem } from '../types';

interface CourseHierarchyBarProps {
  levels: CourseLevel[];
  lessons: CourseLesson[];
  allItems: AudioTranscriptItem[];
  selectedLevelId: string;
  selectedLessonId: string;
  selectedItem: AudioTranscriptItem | null;
  showHidden: boolean;
  onToggleShowHidden: () => void;
  onSelectLevel: (levelId: string) => void;
  onSelectLesson: (lessonId: string) => void;
  onSelectAudioItem: (item: AudioTranscriptItem) => void;
  onOpenDriveModal: () => void;
  onOpenDriveLinksModal: () => void;
  onAddLevel: (name: string) => CourseLevel;
  onAddLesson: (levelId: string, title: string, subtitle?: string) => CourseLesson;
  onEditLesson: (lesson: CourseLesson) => void;
  onToggleHideLesson: (lessonId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onEditAudio: (item: AudioTranscriptItem) => void;
  onToggleHideAudio: (itemId: string) => void;
  onDeleteAudio: (itemId: string) => void;
  canEditContent?: boolean;
  canDeleteContent?: boolean;
}

export const CourseHierarchyBar: React.FC<CourseHierarchyBarProps> = ({
  levels,
  lessons,
  allItems,
  selectedLevelId,
  selectedLessonId,
  selectedItem,
  showHidden,
  onToggleShowHidden,
  onSelectLevel,
  onSelectLesson,
  onSelectAudioItem,
  onOpenDriveModal,
  onOpenDriveLinksModal,
  onAddLevel,
  onAddLesson,
  onEditLesson,
  onToggleHideLesson,
  onDeleteLesson,
  onEditAudio,
  onToggleHideAudio,
  onDeleteAudio,
  canEditContent = true,
  canDeleteContent = true,
}) => {
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const [lessonDropdownOpen, setLessonDropdownOpen] = useState(false);
  const [audioDropdownOpen, setAudioDropdownOpen] = useState(false);

  // New level / lesson inline creation states
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  const currentLevel = levels.find(l => l.id === selectedLevelId) || levels[0];

  // Filter lessons based on showHidden
  const allCurrentLessons = lessons.filter(l => l.levelId === (currentLevel?.id || 'ingles_b1'));
  const visibleLessons = showHidden ? allCurrentLessons : allCurrentLessons.filter(l => !l.isHidden);
  const currentLesson = allCurrentLessons.find(l => l.id === selectedLessonId) || visibleLessons[0];
  
  // Audios belonging to this lesson or level
  const allLessonAudios = allItems.filter(item => {
    if (currentLesson && item.lessonId === currentLesson.id) return true;
    if (!item.lessonId && item.levelId === currentLevel?.id) return true;
    return false;
  });
  const visibleAudios = showHidden ? allLessonAudios : allLessonAudios.filter(it => !it.isHidden);

  const handleCreateLevelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) return;
    const created = onAddLevel(newLevelName.trim());
    onSelectLevel(created.id);
    setNewLevelName('');
    setIsAddingLevel(false);
    setLevelDropdownOpen(false);
  };

  const handleCreateLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !currentLevel) return;
    const created = onAddLesson(currentLevel.id, newLessonTitle.trim());
    onSelectLesson(created.id);
    setNewLessonTitle('');
    setIsAddingLesson(false);
    setLessonDropdownOpen(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-4 sm:px-6 lg:px-8 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Hierarchical Breadcrumb Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-medium">
          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline text-[11px] uppercase tracking-wider font-semibold mr-1">
            Curso:
          </span>

          {/* 1. LEVEL DROPDOWN (e.g. Inglés B1) */}
          <div className="relative">
            <button
              onClick={() => {
                setLevelDropdownOpen(!levelDropdownOpen);
                setLessonDropdownOpen(false);
                setAudioDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
            >
              <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{currentLevel ? currentLevel.name : 'Inglés B1'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {levelDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-40 p-2 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                  Seleccionar Nivel de Inglés
                </span>
                <div className="max-h-48 overflow-y-auto space-y-0.5 transcript-scroll">
                  {levels.map(lvl => (
                    <button
                      key={lvl.id}
                      onClick={() => {
                        onSelectLevel(lvl.id);
                        setLevelDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        currentLevel?.id === lvl.id
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 shrink-0" />
                        <span>{lvl.name}</span>
                      </div>
                      {currentLevel?.id === lvl.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>

                {canEditContent && (
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    {isAddingLevel ? (
                      <form onSubmit={handleCreateLevelSubmit} className="p-1 space-y-1.5">
                        <input
                          type="text"
                          value={newLevelName}
                          onChange={(e) => setNewLevelName(e.target.value)}
                          placeholder="Nombre (ej: Inglés B2)"
                          className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800"
                          autoFocus
                        />
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsAddingLevel(false)}
                            className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-600"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-2 py-0.5 text-[11px] bg-indigo-600 text-white rounded font-medium"
                          >
                            Añadir Nivel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsAddingLevel(true)}
                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Añadir Nuevo Nivel (ej: Inglés B2)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* 2. LESSON DROPDOWN (e.g. Lección 1) */}
          <div className="relative">
            <button
              onClick={() => {
                setLessonDropdownOpen(!lessonDropdownOpen);
                setLevelDropdownOpen(false);
                setAudioDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                currentLesson?.isHidden
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{currentLesson ? currentLesson.title : 'Lección 1'}</span>
              {currentLesson?.isHidden && (
                <span className="text-[10px] px-1 bg-amber-200 dark:bg-amber-900/60 rounded text-amber-900 dark:text-amber-200">
                  Oculta
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {lessonDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-40 p-2 space-y-1.5">
                <div className="flex items-center justify-between px-2 py-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Lecciones en {currentLevel?.name || 'Inglés B1'}
                  </span>
                  <button
                    onClick={onToggleShowHidden}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer hidden-student"
                  >
                    {showHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showHidden ? 'Ocultar archivadas' : 'Ver ocultas'}</span>
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 transcript-scroll">
                  {visibleLessons.length === 0 ? (
                    <div className="text-[11px] text-slate-400 p-2 text-center">
                      Aún no hay lecciones visibles en este nivel.
                    </div>
                  ) : (
                    visibleLessons.map(les => {
                      const isCurrent = currentLesson?.id === les.id;
                      return (
                        <div
                          key={les.id}
                          className={`w-full flex items-center justify-between p-1.5 rounded-lg group transition-colors ${
                            isCurrent
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          } ${les.isHidden ? 'opacity-70 bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                        >
                          <button
                            onClick={() => {
                              onSelectLesson(les.id);
                              setLessonDropdownOpen(false);
                            }}
                            className="flex-1 text-left truncate mr-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold block truncate">{les.title}</span>
                              {les.isHidden && (
                                <span className="text-[9px] px-1 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded shrink-0">
                                  Oculta
                                </span>
                              )}
                            </div>
                            {les.subtitle && (
                              <span className="text-[10px] opacity-75 truncate block">
                                {les.subtitle}
                              </span>
                            )}
                          </button>

                          {/* Action icons: Edit, Hide, Delete */}
                          {(canEditContent || canDeleteContent) && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              {canEditContent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditLesson(les);
                                    setLessonDropdownOpen(false);
                                  }}
                                  title="Editar lección"
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}

                              {canEditContent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleHideLesson(les.id);
                                  }}
                                  title={les.isHidden ? 'Mostrar lección' : 'Ocultar lección'}
                                  className={`p-1 rounded cursor-pointer ${
                                    les.isHidden 
                                      ? 'text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950' 
                                      : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {les.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              )}

                              {canDeleteContent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteLesson(les.id);
                                    setLessonDropdownOpen(false);
                                  }}
                                  title="Eliminar lección"
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {canEditContent && (
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    {isAddingLesson ? (
                      <form onSubmit={handleCreateLessonSubmit} className="p-1 space-y-1.5">
                        <input
                          type="text"
                          value={newLessonTitle}
                          onChange={(e) => setNewLessonTitle(e.target.value)}
                          placeholder="Título (ej: Lección 2)"
                          className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800"
                          autoFocus
                        />
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsAddingLesson(false)}
                            className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-600"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-2 py-0.5 text-[11px] bg-indigo-600 text-white rounded font-medium"
                          >
                            Crear Lección
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsAddingLesson(true)}
                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Añadir Lección a {currentLevel?.name || 'este nivel'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* 3. AUDIO IN LESSON DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => {
                setAudioDropdownOpen(!audioDropdownOpen);
                setLevelDropdownOpen(false);
                setLessonDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border max-w-[200px] sm:max-w-xs truncate ${
                selectedItem?.isHidden
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200/60 dark:border-emerald-800/60'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{selectedItem ? selectedItem.title : 'Seleccionar Audio'}</span>
              {selectedItem?.isHidden && (
                <span className="text-[10px] px-1 bg-amber-200 dark:bg-amber-900/60 rounded text-amber-900 dark:text-amber-200 shrink-0">
                  Oculto
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
            </button>

            {audioDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-40 p-2 space-y-1.5">
                <div className="flex items-center justify-between px-2 py-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Audios en {currentLesson?.title || 'esta lección'}
                  </span>
                  <button
                    onClick={onToggleShowHidden}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer hidden-student"
                  >
                    {showHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showHidden ? 'Ocultar archivados' : 'Ver ocultos'}</span>
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 transcript-scroll">
                  {visibleAudios.length === 0 ? (
                    <div className="text-[11px] text-slate-400 p-3 text-center">
                      No hay audios disponibles en esta lección todavía.
                    </div>
                  ) : (
                    visibleAudios.map(item => {
                      const isCurrent = selectedItem?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`w-full flex items-center justify-between p-1.5 rounded-lg group transition-colors ${
                            isCurrent
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          } ${item.isHidden ? 'opacity-70 bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                        >
                          <button
                            onClick={() => {
                              onSelectAudioItem(item);
                              setAudioDropdownOpen(false);
                            }}
                            className="flex-1 text-left truncate mr-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold block truncate">{item.title}</span>
                              {item.isHidden && (
                                <span className="text-[9px] px-1 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded shrink-0">
                                  Oculto
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] opacity-75 font-mono">
                              {item.segments.length} oraciones · {Math.round(item.audioDuration || 0)}s
                            </span>
                          </button>

                          {/* Audio Actions: Edit, Hide, Delete */}
                          {(canEditContent || canDeleteContent) && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              {canEditContent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditAudio(item);
                                    setAudioDropdownOpen(false);
                                  }}
                                  title="Editar audio"
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}

                              {canEditContent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleHideAudio(item.id);
                                  }}
                                  title={item.isHidden ? 'Mostrar audio' : 'Ocultar audio'}
                                  className={`p-1 rounded cursor-pointer ${
                                    item.isHidden 
                                      ? 'text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950' 
                                      : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {item.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              )}

                              {canDeleteContent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteAudio(item.id);
                                    setAudioDropdownOpen(false);
                                  }}
                                  title="Eliminar audio"
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Controls: Show/Hide Hidden Toggle & Drive Action */}
        <div className="flex items-center gap-2">
          {/* Toggle Hidden Items Button */}
          <button
            onClick={onToggleShowHidden}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border hidden-student ${
              showHidden
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title="Activa o desactiva la visualización de lecciones y audios ocultos"
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showHidden ? 'Viendo Ocultos' : 'Ver Ocultos'}</span>
          </button>

          {canEditContent && (
            <>
              <button
                onClick={onOpenDriveLinksModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors cursor-pointer text-xs shadow-xs"
                title="Pegar enlace directo de audio y transcripción de Google Drive"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Enlace Drive / .VTT</span>
              </button>

              <button
                onClick={onOpenDriveModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors cursor-pointer text-xs border border-slate-200 dark:border-slate-700"
                title="Ver carpeta compartida y sincronizar archivos de Google Drive"
              >
                <FolderSync className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Carpeta Drive</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
