import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Search, 
  FileText, 
  Clock, 
  Upload, 
  Trash2, 
  Download, 
  AlertCircle, 
  Link2, 
  FolderSync, 
  Folder, 
  BookOpen, 
  Plus, 
  ChevronRight, 
  ExternalLink,
  Pencil,
  Eye,
  EyeOff,
  MoreVertical
} from 'lucide-react';
import { AudioTranscriptItem, CourseLevel, CourseLesson } from '../types';
import { formatTime, exportToSRT, exportToVTT, exportToTXT } from '../utils/transcriptParser';

interface AudioSelectorLibraryProps {
  items: AudioTranscriptItem[];
  levels: CourseLevel[];
  lessons: CourseLesson[];
  selectedLevelId: string;
  selectedLessonId: string;
  selectedItem: AudioTranscriptItem | null;
  showHidden: boolean;
  onToggleShowHidden: () => void;
  onSelectLevel: (levelId: string) => void;
  onSelectLesson: (lessonId: string) => void;
  onSelectItem: (item: AudioTranscriptItem) => void;
  onOpenUpload: () => void;
  onOpenPairing: (itemToPair?: AudioTranscriptItem) => void;
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

const CEFR_ORDER: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

function getCefrRank(level?: string): number {
  if (!level) return 999;
  return CEFR_ORDER[level.toUpperCase()] ?? 999;
}

export const AudioSelectorLibrary: React.FC<AudioSelectorLibraryProps> = ({
  items,
  levels,
  lessons,
  selectedLevelId,
  selectedLessonId,
  selectedItem,
  showHidden,
  onToggleShowHidden,
  onSelectLevel,
  onSelectLesson,
  onSelectItem,
  onOpenUpload,
  onOpenPairing,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'all'>('hierarchy');

  // Inline modal / input for new level or lesson
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonSubtitle, setNewLessonSubtitle] = useState('');

  const currentLevel = levels.find(l => l.id === selectedLevelId) || levels[0];
  const allCurrentLessons = lessons.filter(l => l.levelId === (currentLevel?.id || 'ingles_b1'));
  const currentLessons = (showHidden ? allCurrentLessons : allCurrentLessons.filter(l => !l.isHidden))
    .slice()
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    });

  // Hidden counts
  const hiddenLessonsCount = allCurrentLessons.filter(l => l.isHidden).length;
  const hiddenAudiosCount = items.filter(it => it.isHidden).length;

  // Audios grouped for hierarchical view (audios sorted by audio title)
  const lessonsWithAudios = useMemo(() => {
    return currentLessons.map(lesson => {
      const lessonAudios = items.filter(it => {
        if (it.lessonId !== lesson.id) return false;
        if (!showHidden && it.isHidden) return false;
        return true;
      });
      // Sort audios inside the lesson by title (normalizing spaces)
      const sortedAudios = [...lessonAudios].sort((a, b) => 
        a.title.replace(/\s+/g, ' ').trim().localeCompare(b.title.replace(/\s+/g, ' ').trim(), undefined, { numeric: true, sensitivity: 'base' })
      );
      return {
        lesson,
        audios: sortedAudios,
      };
    });
  }, [currentLessons, items, showHidden]);

  // Filtered and sorted items for "Todas las Pistas": Nivel > Título lección > Título audio
  const filteredAllItems = useMemo(() => {
    let pool = showHidden ? items : items.filter(it => !it.isHidden);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      pool = pool.filter(item => {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(query));
        const matchesTranscript = item.segments.some(s => 
          s.text.toLowerCase().includes(query) || (s.translation || '').toLowerCase().includes(query)
        );
        return matchesTitle || matchesDesc || matchesTags || matchesTranscript;
      });
    }

    const levelMap = new Map(levels.map((lvl, idx) => [lvl.id, { order: lvl.order ?? idx, name: lvl.name }]));
    const lessonMap = new Map(lessons.map((lsn, idx) => [lsn.id, { order: lsn.order ?? idx, title: lsn.title }]));

    const norm = (s?: string) => (s || '').replace(/\s+/g, ' ').trim();

    return [...pool].sort((a, b) => {
      // 1. Sort by Nivel (order number or CEFR rank, then level name)
      const lvlA = a.levelId ? levelMap.get(a.levelId) : null;
      const lvlB = b.levelId ? levelMap.get(b.levelId) : null;

      const orderA = lvlA ? lvlA.order : getCefrRank(a.level);
      const orderB = lvlB ? lvlB.order : getCefrRank(b.level);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      const nameA = norm(lvlA?.name || a.level);
      const nameB = norm(lvlB?.name || b.level);
      const levelCmp = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      if (levelCmp !== 0) {
        return levelCmp;
      }

      // 2. Sort by Título lección
      const lsnA = a.lessonId ? lessonMap.get(a.lessonId) : null;
      const lsnB = b.lessonId ? lessonMap.get(b.lessonId) : null;

      if (lsnA && !lsnB) return -1;
      if (!lsnA && lsnB) return 1;

      if (lsnA && lsnB) {
        const lessonTitleCmp = norm(lsnA.title).localeCompare(norm(lsnB.title), undefined, { numeric: true, sensitivity: 'base' });
        if (lessonTitleCmp !== 0) {
          return lessonTitleCmp;
        }
      }

      // 3. Sort by Título audio
      return norm(a.title).localeCompare(norm(b.title), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [items, searchQuery, showHidden, levels, lessons]);

  const handleCreateLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) return;
    const created = onAddLevel(newLevelName.trim());
    onSelectLevel(created.id);
    setNewLevelName('');
    setIsAddingLevel(false);
  };

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !currentLevel) return;
    const created = onAddLesson(currentLevel.id, newLessonTitle.trim(), newLessonSubtitle.trim());
    onSelectLesson(created.id);
    setNewLessonTitle('');
    setNewLessonSubtitle('');
    setIsAddingLesson(false);
  };

  const handleDownloadTranscript = (item: AudioTranscriptItem, format: 'srt' | 'vtt' | 'txt') => {
    let content = '';
    let filename = `${item.title.toLowerCase().replace(/\s+/g, '_')}.${format}`;
    let mime = 'text/plain';

    if (format === 'srt') {
      content = exportToSRT(item.segments);
    } else if (format === 'vtt') {
      content = exportToVTT(item.segments);
      mime = 'text/vtt';
    } else {
      content = exportToTXT(item.segments);
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (levels.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-xl mx-auto space-y-4 my-8 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Aún no tienes cursos asignados
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Tu profesor o administrador debe darte de alta y matricularte en tu curso correspondiente para que puedas acceder al contenido y las grabaciones sincronizadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner with Google Drive Folder Link & Course Hierarchy Info */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-7 shadow-sm border border-indigo-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Folder className="w-4 h-4" />
              <span>Estructura de Aprendizaje: Niveles &gt; Lecciones &gt; Audios</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              Organizador de Audios y Transcripciones de Inglés
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed hidden-student">
              Gestiona, reproduce y sincroniza tus lecciones de inglés. Puedes editar, ocultar o eliminar cualquier lección o audio en cualquier momento.
            </p>
          </div>

          {canEditContent && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={onOpenDriveLinksModal}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 hidden-student"
              >
                <Link2 className="w-4 h-4" />
                <span>+ Enlace Drive / .VTT</span>
              </button>

              <button
                onClick={() => onOpenPairing()}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700/80 transition-all cursor-pointer flex items-center gap-2 hidden-student"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Subir Archivo Local</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Library View Toolbar: View Mode, Search & Hidden Items Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* View selector tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-center overflow-x-auto max-w-full">
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'hierarchy'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Vista por Lecciones ({currentLevel?.name} &gt; Lecciones)</span>
            </button>

            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Todas las Pistas ({items.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Toggle show/hide hidden items */}
            <button
              onClick={onToggleShowHidden}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border shrink-0 hidden-student ${
                showHidden
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title="Muestra u oculta las lecciones y audios archivados"
            >
              {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>
                {showHidden ? 'Viendo Ocultos' : 'Ver Ocultos'}
                {(hiddenLessonsCount > 0 || hiddenAudiosCount > 0) && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-full text-[10px]">
                    {hiddenLessonsCount + hiddenAudiosCount}
                  </span>
                )}
              </span>
            </button>

            {/* Search bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por texto o título..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Level Tabs strip (e.g. Inglés B1, Inglés B2...) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Nivel:</span>
            {levels.map(lvl => (
              <button
                key={lvl.id}
                onClick={() => onSelectLevel(lvl.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentLevel?.id === lvl.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{lvl.name}</span>
              </button>
            ))}

            {canEditContent && (
              isAddingLevel ? (
                <form onSubmit={handleCreateLevel} className="flex items-center gap-1 ml-1">
                  <input
                    type="text"
                    value={newLevelName}
                    onChange={(e) => setNewLevelName(e.target.value)}
                    placeholder="Ej: Inglés B2"
                    className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-indigo-400 rounded-md"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-medium rounded-md cursor-pointer"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingLevel(false)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingLevel(true)}
                  className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:border-indigo-500 font-medium transition-colors cursor-pointer flex items-center gap-1"
                  title="Añadir nuevo nivel de curso (ej: Inglés B2, Inglés C1...)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Nivel (ej: B2)</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'hierarchy' ? (
        <div className="space-y-8">
          {/* Header of Active Level */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>Nivel Seleccionado</span>
                <span aria-hidden="true">·</span>
                <span>{currentLessons.length} lecciones visibles</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {currentLevel ? currentLevel.name : 'Inglés B1'}
              </h2>
              {currentLevel?.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentLevel.description}
                </p>
              )}
            </div>

            {canEditContent && (
              <button
                onClick={() => setIsAddingLesson(true)}
                className="self-start sm:self-center px-3.5 py-2 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-lg hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Lección a {currentLevel?.name || 'este nivel'}</span>
              </button>
            )}
          </div>

          {/* Inline Add Lesson Form */}
          {canEditContent && isAddingLesson && (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                Nueva Lección para {currentLevel?.name || 'Inglés B1'}
              </h3>
              <form onSubmit={handleCreateLesson} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="Título (ej: Lección 2, Lección 3...)"
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  autoFocus
                />
                <input
                  type="text"
                  value={newLessonSubtitle}
                  onChange={(e) => setNewLessonSubtitle(e.target.value)}
                  placeholder="Tema opcional (ej: Planes de Fin de Semana)"
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    Guardar Lección
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingLesson(false)}
                    className="px-3 py-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lessons List for this Level */}
          {lessonsWithAudios.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Aún no has creado lecciones en {currentLevel?.name || 'este nivel'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crea tu primera lección (ej: "Lección 1") y asígnale los audios y transcripciones correspondientes.
              </p>
              {canEditContent && (
                <button
                  onClick={() => setIsAddingLesson(true)}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  + Crear Lección 1
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {lessonsWithAudios.map(({ lesson, audios }) => {
                return (
                  <div
                    key={lesson.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all p-5 sm:p-6 shadow-xs space-y-4 ${
                      lesson.isHidden
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Lesson Header with Edit, Hide & Delete actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          lesson.isHidden 
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' 
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {lesson.order || '1'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {currentLevel?.name} &gt; {lesson.title}
                            </h3>
                            {lesson.isHidden && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-full border border-amber-300 dark:border-amber-700">
                                Lección Oculta
                              </span>
                            )}
                          </div>
                          {lesson.subtitle && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 block">
                              {lesson.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Lesson Management Buttons (Editar, Ocultar, Eliminar) */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
                        <span className="text-slate-400 font-mono text-[11px] mr-1">
                          {audios.length} {audios.length === 1 ? 'audio' : 'audios'}
                        </span>

                        {/* Edit Lesson */}
                        {canEditContent && (
                          <button
                            onClick={() => onEditLesson(lesson)}
                            title="Editar título, tema o nivel de esta lección"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-1 font-medium transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                        )}

                        {/* Hide / Unhide Lesson */}
                        {canEditContent && (
                          <button
                            onClick={() => onToggleHideLesson(lesson.id)}
                            title={lesson.isHidden ? 'Mostrar lección en los menús' : 'Ocultar lección'}
                            className={`p-1.5 rounded-lg cursor-pointer flex items-center gap-1 font-medium transition-colors ${
                              lesson.isHidden
                                ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200'
                                : 'text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {lesson.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{lesson.isHidden ? 'Desocultar' : 'Ocultar'}</span>
                          </button>
                        )}

                        {/* Delete Lesson */}
                        {canDeleteContent && (
                          <button
                            onClick={() => onDeleteLesson(lesson.id)}
                            title="Eliminar lección"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer flex items-center gap-1 font-medium transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        )}

                        {canEditContent && (
                          <>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                            {/* Add audio to this lesson */}
                            <button
                              onClick={() => {
                                onSelectLevel(currentLevel.id);
                                onSelectLesson(lesson.id);
                                onOpenDriveLinksModal();
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Añadir Audio</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Audios in this lesson */}
                    {audios.length === 0 ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-xs text-slate-500 mb-2">
                          Esta lección aún no tiene pistas de audio asignadas.
                        </p>
                        {canEditContent && (
                          <button
                            onClick={() => {
                              onSelectLevel(currentLevel.id);
                              onSelectLesson(lesson.id);
                              onOpenDriveLinksModal();
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Conectar Audio con Enlace / .VTT</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {audios.map(item => {
                          const isSelected = selectedItem?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                                  : item.isHidden
                                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80'
                                  : 'bg-slate-50/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                      {formatTime(item.audioDuration || 0)}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{item.segments.length} marcas</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{item.accent}</span>
                                  </div>

                                  {item.isHidden && (
                                    <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded text-[10px] font-bold uppercase tracking-wider font-sans">
                                      Oculto
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                  {item.title}
                                </h4>

                                {item.segments.length > 0 && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2">
                                    "{item.segments[0].text}"
                                  </p>
                                )}
                              </div>

                              {/* Audio card actions: Play, Edit, Hide, Delete */}
                              <div className="pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                                <button
                                  onClick={() => {
                                    onSelectLevel(currentLevel.id);
                                    onSelectLesson(lesson.id);
                                    onSelectItem(item);
                                  }}
                                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600'
                                  }`}
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>{isSelected ? 'Cargado' : 'Reproducir'}</span>
                                </button>

                                {/* Edit Audio */}
                                {canEditContent && (
                                  <button
                                    onClick={() => onEditAudio(item)}
                                    title="Editar audio (título, nivel, lección, descripción)"
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Hide / Unhide Audio */}
                                {canEditContent && (
                                  <button
                                    onClick={() => onToggleHideAudio(item.id)}
                                    title={item.isHidden ? 'Mostrar audio' : 'Ocultar audio'}
                                    className={`p-1.5 rounded cursor-pointer ${
                                      item.isHidden
                                        ? 'text-amber-600 bg-amber-100 dark:bg-amber-950 hover:bg-amber-200'
                                        : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    {item.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                )}

                                {/* Delete Audio */}
                                {canDeleteContent && (
                                  <button
                                    onClick={() => onDeleteAudio(item.id)}
                                    title="Eliminar este audio"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDownloadTranscript(item, 'srt')}
                                  title="Descargar subtítulos SRT"
                                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* All items list */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAllItems.map(item => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 space-y-3 flex flex-col justify-between ${
                item.isHidden
                  ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/70'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {levels.find(l => l.id === item.levelId)?.name || `Nivel ${item.level}`}
                    </span>
                    {lessons.find(l => l.id === item.lessonId) && (
                      <>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {lessons.find(l => l.id === item.lessonId)?.title}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="font-mono">{formatTime(item.audioDuration || 0)}</span>
                  </div>

                  {item.isHidden && (
                    <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded text-[10px] font-bold">
                      Oculto
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h4>
                {item.segments.length > 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2 mt-1">
                    "{item.segments[0].text}"
                  </p>
                ) : item.description ? (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                ) : null}
              </div>

              <div className="pt-2 flex items-center gap-1.5">
                <button
                  onClick={() => onSelectItem(item)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Reproducir</span>
                </button>

                {canEditContent && (
                  <button
                    onClick={() => onEditAudio(item)}
                    title="Editar audio"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {canEditContent && (
                  <button
                    onClick={() => onToggleHideAudio(item.id)}
                    title={item.isHidden ? 'Mostrar audio' : 'Ocultar audio'}
                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {item.isHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}

                {canDeleteContent && (
                  <button
                    onClick={() => onDeleteAudio(item.id)}
                    title="Eliminar audio"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
