import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  Headphones, 
  Sparkles,
  ArrowRight,
  BookCheck,
  Check
} from 'lucide-react';
import { AppUser } from '../types';
import { login } from '../services/authService';

interface AuthGateProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    } else {
      setError(result.error || 'Error en inicio de sesión');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-14 px-4">
      {/* Hero Welcome Header */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 mb-2">
          <Headphones className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Aula Virtual <span className="text-indigo-600 dark:text-indigo-400">Zona Sonora</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          Plataforma de práctica auditiva y transcripción interactiva sincronizada. Inicia sesión para acceder a los cursos asignados por tu profesor.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {/* Login Form */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Identificación de Usuario
              </h2>
              <p className="text-xs text-slate-500">
                Introduce las credenciales dadas por tu profesor
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Usuario o Alias
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej: alumno, profesor, admin..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
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
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Validando cuenta...</span>
              ) : (
                <>
                  <span>Entrar al Aula</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              Si eres un nuevo alumno, tu profesor debe registrarte primero y asignarte a tu curso correspondiente para que puedas acceder.
            </span>
          </div>
        </div>

        {/* Accesos rápidos de prueba temporalmente ocultos como solicitado */}
      </div>
    </div>
  );
};
