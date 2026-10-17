import React from 'react';
import { Headphones, Plus, BookOpen, BookmarkCheck, Library, Link2 } from 'lucide-react';

interface TopBarProps {
  activeView: 'library' | 'player' | 'pairing' | 'vocabulary' | 'guide';
  onNavigate: (view: 'library' | 'player' | 'pairing' | 'vocabulary' | 'guide') => void;
  onOpenUpload: () => void;
  hasActiveTrack: boolean;
  activeTrackTitle?: string;
  savedWordsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onNavigate,
  onOpenUpload,
  hasActiveTrack,
  activeTrackTitle,
  savedWordsCount,
}) => {
  return (
    <header className={`z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 ${
      activeView === 'player' ? 'relative md:sticky md:top-0' : 'sticky top-0'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => onNavigate('library')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap block leading-tight">
                LingoSync
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block leading-none">
                Audio & Transcript Studio
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: 4-5 clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onNavigate('library')}
            className={`cursor-pointer whitespace-nowrap transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 ${
              activeView === 'library' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            <Library className="w-4 h-4" />
            <span>Biblioteca de Audios</span>
          </button>

          {hasActiveTrack && (
            <button
              onClick={() => onNavigate('player')}
              className={`cursor-pointer whitespace-nowrap transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 ${
                activeView === 'player' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
              }`}
            >
              <Headphones className="w-4 h-4 text-emerald-500" />
              <span className="max-w-[140px] truncate">
                {activeTrackTitle || 'Reproductor'}
              </span>
            </button>
          )}

          <button
            onClick={() => onNavigate('pairing')}
            className={`cursor-pointer whitespace-nowrap transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 ${
              activeView === 'pairing' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Emparejar & Sincronizar</span>
          </button>

          <button
            onClick={() => onNavigate('vocabulary')}
            className={`cursor-pointer whitespace-nowrap transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 ${
              activeView === 'vocabulary' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Mi Vocabulario ({savedWordsCount})</span>
          </button>

          <button
            onClick={() => onNavigate('guide')}
            className={`cursor-pointer whitespace-nowrap transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 ${
              activeView === 'guide' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Método de Escucha</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Enlace Drive / .VTT</span>
          </button>
        </div>

      </div>
    </header>
  );
};
