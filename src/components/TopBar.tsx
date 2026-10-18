import React, { useState, useRef, useEffect } from 'react';
import { 
  Headphones, 
  Plus, 
  BookOpen, 
  BookmarkCheck, 
  Library, 
  Link2, 
  User, 
  ShieldCheck, 
  GraduationCap, 
  Users, 
  LogOut, 
  ChevronDown, 
  LogIn, 
  Sparkles 
} from 'lucide-react';
import { AppUser, UserRole, CourseLevel } from '../types';

interface TopBarProps {
  activeView: 'library' | 'player' | 'pairing' | 'vocabulary' | 'guide';
  onNavigate: (view: 'library' | 'player' | 'pairing' | 'vocabulary' | 'guide') => void;
  onOpenUpload: () => void;
  hasActiveTrack: boolean;
  activeTrackTitle?: string;
  savedWordsCount: number;
  currentUser: AppUser | null;
  levels?: CourseLevel[];
  onOpenLogin: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
  canEditContent: boolean;
  canManageUsers: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onNavigate,
  onOpenUpload,
  hasActiveTrack,
  activeTrackTitle,
  savedWordsCount,
  currentUser,
  levels = [],
  onOpenLogin,
  onOpenUserManagement,
  onLogout,
  canEditContent,
  canManageUsers,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <ShieldCheck className="w-3 h-3" />
            <span>Admin</span>
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <GraduationCap className="w-3 h-3" />
            <span>Profesor</span>
          </span>
        );
      case 'student':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <BookOpen className="w-3 h-3" />
            <span>Alumno</span>
          </span>
        );
    }
  };

  return (
    <header className={`z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 ${
      activeView === 'player' ? 'relative md:sticky md:top-0' : 'sticky top-0'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        
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
                Zona Sonora
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block leading-none">
                Audio & Transcript Studio
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation links only visible when logged in */}
        {currentUser && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
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

            {canEditContent && (
              <button
                onClick={() => onNavigate('pairing')}
                className={`cursor-pointer whitespace-nowrap transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 ${
                  activeView === 'pairing' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Emparejar & Sincronizar</span>
              </button>
            )}

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
              <span>Método</span>
            </button>
          </nav>
        )}

        {/* Zone 3: Actions + User Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {canEditContent && (
            <button
              onClick={onOpenUpload}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              title="Importar audios o sincronizaciones"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Enlace Drive / .VTT</span>
            </button>
          )}

          {/* User Profile Pill & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {currentUser ? (() => {
              const enrolledNames = (currentUser.enrolledCourseIds || [])
                .map(id => levels?.find(l => l.id === id)?.name || id)
                .join(', ');

              const teacherCourseNames = (levels || [])
                .filter(l => l.teacherIds?.includes(currentUser.id) || l.createdById === currentUser.id)
                .map(l => l.name)
                .join(', ');

              return (
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-xs font-bold text-slate-900 dark:text-white max-w-[130px] truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 max-w-[130px] truncate">
                      {currentUser.role === 'admin'
                        ? 'Admin'
                        : currentUser.role === 'teacher'
                        ? (teacherCourseNames ? `Profesor (${teacherCourseNames})` : 'Profesor')
                        : (enrolledNames ? `Alumna (${enrolledNames})` : 'Alumna')}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              );
            })() : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
            )}

            {/* Dropdown Menu */}
            {userDropdownOpen && currentUser && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in duration-100 space-y-1">
                {/* User card summary */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 mb-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </span>
                    {getRoleBadge(currentUser.role)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    @{currentUser.username} {currentUser.email && `· ${currentUser.email}`}
                  </div>
                  {currentUser.role === 'teacher' && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[10px] text-sky-700 dark:text-sky-300 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        Cursos que impartes: {(levels || []).filter(l => l.teacherIds?.includes(currentUser.id) || l.createdById === currentUser.id).map(l => l.name).join(', ') || 'Sin cursos'}
                      </span>
                    </div>
                  )}
                  {currentUser.role === 'student' && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {(currentUser.enrolledCourseIds || []).map(id => levels?.find(l => l.id === id)?.name || id).join(', ') || 'Sin cursos asignados'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Management option for admin/teacher */}
                {canManageUsers && (
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenUserManagement();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>Gestión de Usuarios & Roles</span>
                  </button>
                )}

                {/* Switch user */}
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Cambiar de Usuario</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                {/* Logout */}
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};

