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
    <div className="max-w-4xl mx-auto py-8 sm:py-14 px-4">
      {/* Hero Welcome Header */}
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 mb-2">
          <Headphones className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Aula Virtual <span className="text-indigo-600 dark:text-indigo-400">LingoSync</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Plataforma de práctica auditiva y transcripción interactiva sincronizada. Inicia sesión para acceder únicamente a los cursos asignados por tu profesor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Login Form */}
        <div className="md:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-6">
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

        {/* Right Column: Fast Demo Access (Roles & Courses demonstration) */}
        <div className="md:col-span-6 space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 mb-1">
              <Check className="w-4 h-4 text-indigo-600" />
              <span>Accesos Rápidos de Prueba (Demostración de Roles)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Pulsa en cualquiera de los perfiles para comprobar al instante la gestión de cursos y la restricción de contenidos por rol:
            </p>
          </div>

          <div className="space-y-3">
            {/* Admin Demo */}
            <div
              onClick={() => handleQuickLogin('admin', 'admin')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Ana Barberá (Administradora)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">user: admin · pass: admin</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pl-10">
                Acceso completo a todos los cursos, usuarios, subida de audios y gestión de profesores.
              </p>
            </div>

            {/* Teacher Demo */}
            <div
              onClick={() => handleQuickLogin('profesor', 'profe')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      Carlos Méndez (Profesor)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">user: profesor · pass: profe</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  Profesor (B1 y B2)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pl-10">
                Acceso exclusivo a sus cursos asignados (<strong className="text-sky-600 dark:text-sky-400">Inglés B1 e Inglés B2</strong>) y a sus alumnos matriculados para mayor claridad de trabajo.
              </p>
            </div>

            {/* Student 1 Demo - Enrolled only in B1 */}
            <div
              onClick={() => handleQuickLogin('alumno', 'alumno')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Sofía Navarro (Alumna)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">user: alumno · pass: alumno</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Solo Inglés B1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pl-10">
                Solo ve y reproduce el contenido de <strong className="text-emerald-600 dark:text-emerald-400">Inglés B1</strong>. Los demás cursos permanecen ocultos.
              </p>
            </div>

            {/* Student 2 Demo - Multi-course enrollment (B1 + B2) */}
            <div
              onClick={() => handleQuickLogin('nuevo_alumno', 'pass')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    <BookCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Laura García (Alumna Multicurso)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">user: nuevo_alumno · pass: pass</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Inglés B1 + B2
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pl-10">
                Demuestra el soporte multicurso: matriculada simultáneamente en <strong className="text-indigo-600 dark:text-indigo-400">Inglés B1 e Inglés B2</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
