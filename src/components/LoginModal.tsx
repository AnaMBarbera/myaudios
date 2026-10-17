import React, { useState } from 'react';
import { X, Lock, User, ShieldCheck, GraduationCap, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppUser } from '../types';
import { login } from '../services/authService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
  currentUser: AppUser | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Por favor introduce tu usuario y contraseña');
      return;
    }

    setIsLoading(true);
    const result = await login(username.trim(), password.trim());
    setIsLoading(false);

    if (result.success && result.user) {
      onLoginSuccess(result.user);
      onClose();
    } else {
      setError(result.error || 'Credenciales no válidas');
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    setIsLoading(true);
    const result = await login(u, p);
    setIsLoading(false);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
      onClose();
    } else {
      setError(result.error || 'Error en acceso rápido');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {currentUser ? 'Cambiar de Usuario' : 'Acceso al Aula Virtual'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser 
                  ? 'Cambia a otra cuenta o rol del sistema'
                  : 'Inicia sesión con las credenciales dadas por tu profesor para ver tus cursos'}
              </p>
            </div>
          </div>
          {currentUser && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, profesor, alumno..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce tu contraseña"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Verificando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          {/* Quick-switch buttons for demonstration / testing */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Acceso rápido para probar los roles y cursos:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin')}
                className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  Todos los cursos y control total
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('profesor', 'profe')}
                className="p-2.5 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/60 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold text-xs mb-0.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Profesor Carlos</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  Solo accede a sus cursos B1 y B2
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('alumno', 'alumno')}
                className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-0.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Alumna Sofía</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  Solo curso Inglés B1
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nuevo_alumno', 'pass')}
                className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-0.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Alumna Laura</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  Matriculada en B1 y B2
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
