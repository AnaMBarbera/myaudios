import React from 'react';
import { 
  BookOpen, 
  Ear, 
  Repeat, 
  FileCheck, 
  Sparkles, 
  HelpCircle, 
  ArrowRight,
  Headphones,
  Link2
} from 'lucide-react';

interface LearningGuideProps {
  onStartListening: () => void;
  onOpenPairing: () => void;
}

export const LearningGuide: React.FC<LearningGuideProps> = ({
  onStartListening,
  onOpenPairing,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Guía Pedagógica de Listening</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Cómo aprovechar al máximo tus audios y transcripciones
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Aprender inglés mediante audios sincronizados es el método más respaldado por la lingüística aplicada para cerrar la brecha entre el inglés escrito y el inglés hablado natural.
          </p>
        </div>
      </div>

      {/* The 4-Step Listening System */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          El Método de los 4 Pasos para Oído Bilingüe
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Escucha Inicial Sin Transcripción
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Reproduce la pista completa sin leer el texto. Intenta captar la idea principal (gist), el tono de los hablantes y el contexto general sin preocuparte por cada palabra individual.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Escucha Sincronizada con Texto Activo
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Sigue el resaltado en pantalla mientras el audio avanza. Aquí tu cerebro conecta la ortografía con las reducciones orales (como <em>gonna</em>, <em>would've</em>, sonidos enlazados). Pulsa las palabras difíciles para ver su fonética IPA.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Práctica de Shadowing (Eco del Habla)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Activa la repetición de frase (bucle A-B) o el modo Shadowing. Escucha la frase e imítala inmediatamente en voz alta, copiando la entonación y acentuación nativa. Grábate para escuchar tu evolución.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Autoevaluación mediante Dictado
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Pásate a la pestaña de Dictado en el reproductor. Escucha y escribe la frase al dictado para comprobar si realmente has captado todos los detalles gramaticales y preposiciones.
            </p>
          </div>
        </div>
      </div>

      {/* How to add custom audios */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            ¿Cómo subir tus propios audios y transcripciones?
          </h2>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>
            <strong>1. Audios de Podcasts, Series o Exámenes:</strong> Puedes subir cualquier archivo local en formato <code>.mp3</code>, <code>.wav</code>, <code>.m4a</code> o <code>.ogg</code>.
          </p>
          <p>
            <strong>2. Subtítulos ya sincronizados (.SRT o .VTT):</strong> Si tienes un archivo descargado de YouTube, películas o cursos, súbelo en la pestaña de Emparejamiento. La app detectará los segundos de cada frase automáticamente.
          </p>
          <p>
            <strong>3. Texto plano sin tiempos:</strong> Pega el texto en inglés y usa la herramienta <em>Tap-to-Sync</em>. Mientras suena tu audio, pulsa la barra espaciadora cada vez que empiece una frase y tendrás tu lección sincronizada al instante.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            onClick={onStartListening}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center gap-2"
          >
            <Headphones className="w-4 h-4" />
            <span>Explorar Audios de Ejemplo</span>
          </button>

          <button
            onClick={onOpenPairing}
            className="px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            <span>Sincronizar mi Primer Audio Propio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
