import React, { useState, useMemo } from 'react';
import { 
  BookmarkCheck, 
  Search, 
  Volume2, 
  Trash2, 
  Check, 
  Download, 
  RotateCw, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { SavedWord } from '../types';
import { playWordSpeech } from '../utils/dictionary';

interface VocabularyBankProps {
  words: SavedWord[];
  onToggleMastered: (id: string) => void;
  onDeleteWord: (id: string) => void;
  onOpenLibrary: () => void;
}

export const VocabularyBank: React.FC<VocabularyBankProps> = ({
  words,
  onToggleMastered,
  onDeleteWord,
  onOpenLibrary,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'learning' | 'mastered'>('all');
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isFlashcardMode, setIsFlashcardMode] = useState<boolean>(false);

  const filteredWords = useMemo(() => {
    return words.filter(w => {
      if (filterState === 'learning' && w.mastered) return false;
      if (filterState === 'mastered' && !w.mastered) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          w.word.toLowerCase().includes(q) ||
          w.spanish.toLowerCase().includes(q) ||
          w.definition.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [words, searchQuery, filterState]);

  const activeCard = filteredWords[flashcardIndex] || filteredWords[0];

  const handleExportCSV = () => {
    if (words.length === 0) return;
    const header = 'Word,Phonetic,Spanish,Definition,Example,Mastered\n';
    const rows = words.map(w => 
      `"${w.word}","${w.phonetic}","${w.spanish}","${w.definition.replace(/"/g, '""')}","${w.example.replace(/"/g, '""')}",${w.mastered}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lingosync_vocabulario_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <BookmarkCheck className="w-4 h-4" />
            <span>Banco de Léxico Personal</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Mi Vocabulario de Audios
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Palabras guardadas al hacer clic en las transcripciones mientras escuchas tus pistas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {words.length > 0 && (
            <>
              <button
                onClick={() => {
                  setIsFlashcardMode(!isFlashcardMode);
                  setIsFlipped(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-lg hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{isFlashcardMode ? 'Ver Lista' : 'Modo Flashcards'}</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {words.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <BookmarkCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Tu banco de vocabulario está vacío
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Al reproducir cualquier audio con transcripción, pulsa sobre las palabras desconocidas y selecciona "Guardar en Mi Vocabulario".
          </p>
          <button
            onClick={onOpenLibrary}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
          >
            Ir a la Biblioteca de Audios
          </button>
        </div>
      ) : isFlashcardMode ? (
        /* Flashcard Interactive Deck */
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Tarjeta {flashcardIndex + 1} de {filteredWords.length}</span>
            <span>{activeCard?.mastered ? 'Dominada' : 'En aprendizaje'}</span>
          </div>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[260px] bg-white dark:bg-slate-900 border-2 border-indigo-500/30 rounded-2xl p-8 flex flex-col justify-between items-center text-center cursor-pointer shadow-md hover:border-indigo-500 transition-all select-none"
          >
            {!isFlipped ? (
              <div className="my-auto space-y-3">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  Haz clic para ver traducción y significado
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white capitalize">
                  {activeCard.word}
                </h2>
                <span className="text-sm font-mono text-slate-500 block">
                  {activeCard.phonetic}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playWordSpeech(activeCard.word);
                  }}
                  className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 hover:scale-110 transition-transform cursor-pointer inline-block"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="my-auto space-y-4">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Español</span>
                  <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {activeCard.spanish}
                  </h3>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Definición</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {activeCard.definition}
                  </p>
                </div>

                {activeCard.example && (
                  <p className="text-xs italic text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                    "{activeCard.example}"
                  </p>
                )}
              </div>
            )}

            <span className="text-[11px] text-slate-400">
              Pulsa la tarjeta para voltear
            </span>
          </div>

          {/* Flashcard navigation controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                setFlashcardIndex(prev => (prev > 0 ? prev - 1 : filteredWords.length - 1));
                setIsFlipped(false);
              }}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              Anterior
            </button>

            <button
              onClick={() => onToggleMastered(activeCard.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 ${
                activeCard.mastered
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{activeCard.mastered ? '¡Dominada!' : 'Marcar Dominada'}</span>
            </button>

            <button
              onClick={() => {
                setFlashcardIndex(prev => (prev < filteredWords.length - 1 ? prev + 1 : 0));
                setIsFlipped(false);
              }}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : (
        /* Standard Table / List Mode */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar palabra o traducción..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setFilterState('all')}
                className={`px-3 py-1 rounded-md cursor-pointer ${
                  filterState === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-500'
                }`}
              >
                Todas ({words.length})
              </button>
              <button
                onClick={() => setFilterState('learning')}
                className={`px-3 py-1 rounded-md cursor-pointer ${
                  filterState === 'learning' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-500'
                }`}
              >
                En Aprendizaje ({words.filter(w => !w.mastered).length})
              </button>
              <button
                onClick={() => setFilterState('mastered')}
                className={`px-3 py-1 rounded-md cursor-pointer ${
                  filterState === 'mastered' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-500'
                }`}
              >
                Dominadas ({words.filter(w => w.mastered).length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredWords.map(w => (
              <div
                key={w.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                      {w.word}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => playWordSpeech(w.word)}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        title="Escuchar pronunciación"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteWord(w.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Eliminar de mi vocabulario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 block mb-2">
                    {w.phonetic}
                  </span>

                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {w.spanish}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {w.definition}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[140px]">
                    {w.sourceAudioTitle || 'Audio personalizado'}
                  </span>
                  <button
                    onClick={() => onToggleMastered(w.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                      w.mastered
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>{w.mastered ? 'Dominada' : 'Aprendiendo'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
