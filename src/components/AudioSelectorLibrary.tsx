import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Search, 
  FileText, 
  Clock, 
  Globe, 
  Upload, 
  SlidersHorizontal, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Link2,
  Sparkles
} from 'lucide-react';
import { AudioTranscriptItem, Category, CefrLevel } from '../types';
import { formatTime, exportToSRT, exportToVTT, exportToTXT } from '../utils/transcriptParser';

interface AudioSelectorLibraryProps {
  items: AudioTranscriptItem[];
  selectedItem: AudioTranscriptItem | null;
  onSelectItem: (item: AudioTranscriptItem) => void;
  onOpenUpload: () => void;
  onOpenPairing: (itemToPair?: AudioTranscriptItem) => void;
  onDeleteItem: (id: string) => void;
}

export const AudioSelectorLibrary: React.FC<AudioSelectorLibraryProps> = ({
  items,
  selectedItem,
  onSelectItem,
  onOpenUpload,
  onOpenPairing,
  onDeleteItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [syncStatusFilter, setSyncStatusFilter] = useState<'all' | 'synced' | 'pending'>('all');

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (selectedCategory === 'custom' && !item.audioBlobId && item.isBuiltIn) {
        return false;
      } else if (selectedCategory !== 'all' && selectedCategory !== 'custom' && item.category !== selectedCategory) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'all' && item.level !== selectedLevel) {
        return false;
      }

      // Sync status filter
      const hasSegments = item.segments && item.segments.length > 0;
      if (syncStatusFilter === 'synced' && !hasSegments) return false;
      if (syncStatusFilter === 'pending' && hasSegments) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(query));
        const matchesTranscript = item.segments.some(s => 
          s.text.toLowerCase().includes(query) || (s.translation || '').toLowerCase().includes(query)
        );
        return matchesTitle || matchesDesc || matchesTags || matchesTranscript;
      }

      return true;
    });
  }, [items, searchQuery, selectedCategory, selectedLevel, syncStatusFilter]);

  const totalMinutes = useMemo(() => {
    const totalSecs = items.reduce((acc, it) => acc + (it.audioDuration || 0), 0);
    return (totalSecs / 60).toFixed(1);
  }, [items]);

  const totalSegments = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.segments?.length || 0), 0);
  }, [items]);

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

  return (
    <div className="space-y-8">
      {/* Hero Welcome & Stats */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-300 mb-2">
            <span>Audio & Transcript Synchronization Hub</span>
            <span aria-hidden="true">·</span>
            <span>Estudio de Listening en Inglés</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3 text-balance">
            Selecciona tus audios de inglés y practica con transcripciones sincronizadas
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
            Explora lecciones de diálogo preparadas o sube tus propios archivos de audio con sus correspondientes subtítulos y textos. Salta a cualquier segundo pulsando en el texto y domina la pronunciación nativa.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Audios Disponibles</span>
              <span className="text-lg font-bold text-white font-mono tabular-nums">{items.length} pistas</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Oraciones Sincronizadas</span>
              <span className="text-lg font-bold text-white font-mono tabular-nums">{totalSegments} líneas</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Tiempo de Escucha</span>
              <span className="text-lg font-bold text-white font-mono tabular-nums">~{totalMinutes} min</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Niveles Cubiertos</span>
              <span className="text-lg font-bold text-white">A1 hasta C1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Deck: Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Search Input Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, palabra en la transcripción, etiqueta..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPairing()}
              className="px-3.5 py-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
              title="Emparejar un nuevo audio con un archivo de subtítulo o texto"
            >
              <Link2 className="w-4 h-4" />
              <span>Nuevo Emparejamiento</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="px-3.5 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Archivo</span>
            </button>
          </div>
        </div>

        {/* Categories & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Categories Segmented Control */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 max-w-full">
            <span className="text-slate-400 dark:text-slate-500 mr-1 font-medium whitespace-nowrap">Tema:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'conversation', label: 'Conversación' },
              { id: 'travel', label: 'Viajes' },
              { id: 'business', label: 'Negocios' },
              { id: 'academic', label: 'Académico' },
              { id: 'custom', label: 'Mis Audios' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">Nivel MCER:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todos los niveles</option>
              <option value="A1">A1 - Principiante</option>
              <option value="A2">A2 - Elemental</option>
              <option value="B1">B1 - Intermedio</option>
              <option value="B2">B2 - Intermedio Alto</option>
              <option value="C1">C1 - Avanzado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Audio-Transcript Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>Mostrando {filteredItems.length} de {items.length} audios</span>
          <span>Pulsa en una tarjeta para cargarla en el reproductor</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
            <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              No se encontraron pistas de audio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Prueba cambiando los filtros de búsqueda o sube un nuevo audio con su archivo de transcripción.
            </p>
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Subir Audio o Transcripción
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const isSelected = selectedItem?.id === item.id;
              const hasSegments = item.segments && item.segments.length > 0;
              const durationFormatted = formatTime(item.audioDuration || 0);

              return (
                <div
                  key={item.id}
                  className={`group relative bg-white dark:bg-slate-900 rounded-xl border transition-all duration-150 p-5 flex flex-col justify-between ${
                    isSelected 
                      ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Unboxed Metadata with Typographic Separator */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        Nivel {item.level}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{durationFormatted}</span>
                      <span aria-hidden="true">·</span>
                      <span>Acento {item.accent}</span>
                      {item.isBuiltIn && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400">Lección Lista</span>
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Transcript Segment Preview Snippet */}
                    {hasSegments ? (
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 mb-4 text-xs text-slate-600 dark:text-slate-400 italic border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold not-italic text-slate-700 dark:text-slate-300 mr-1">
                          {item.segments[0].speaker ? `${item.segments[0].speaker}: ` : '“'}
                        </span>
                        {item.segments[0].text.substring(0, 85)}...
                        <div className="mt-1 text-[11px] not-italic text-slate-400 dark:text-slate-500 font-mono">
                          {item.segments.length} oraciones sincronizadas
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs rounded-lg p-2.5 mb-4 border border-amber-200 dark:border-amber-800/40 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Sin transcripción asociada aún</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectItem(item)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-slate-750 hover:text-indigo-600 dark:hover:text-indigo-300'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isSelected ? 'Cargado en Reproductor' : 'Seleccionar & Escuchar'}</span>
                    </button>

                    {/* Quick export / edit menu */}
                    <div className="flex items-center gap-1">
                      {hasSegments && (
                        <button
                          onClick={() => handleDownloadTranscript(item, 'srt')}
                          title="Descargar subtítulos SRT"
                          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onOpenPairing(item)}
                        title="Editar sincronización o transcripción"
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>

                      {!item.isBuiltIn && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar "${item.title}" de tu biblioteca?`)) {
                              onDeleteItem(item.id);
                            }
                          }}
                          title="Eliminar de mi biblioteca"
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
