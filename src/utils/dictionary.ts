export interface WordDefinitionResult {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  spanish: string;
  example?: string;
  audioUrl?: string;
}

// Built-in offline quick dictionary for instant lookup
const BUILTIN_VOCAB: Record<string, { phonetic: string; partOfSpeech: string; definition: string; spanish: string; example: string }> = {
  restaurant: {
    phonetic: '/ˈrestərɒnt/',
    partOfSpeech: 'noun',
    definition: 'A place where people pay to sit and eat meals that are cooked and served on the premises.',
    spanish: 'restaurante',
    example: 'We booked a table at an Italian restaurant.',
  },
  reservation: {
    phonetic: '/ˌrezəˈveɪʃən/',
    partOfSpeech: 'noun',
    definition: 'An arrangement to secure a seat, table, or room at a particular time.',
    spanish: 'reserva',
    example: 'I would like to make a dinner reservation for two tonight.',
  },
  strategy: {
    phonetic: '/ˈstrætədʒi/',
    partOfSpeech: 'noun',
    definition: 'A plan of action or policy designed to achieve a major or overall aim.',
    spanish: 'estrategia',
    example: 'Our Q3 strategy focuses on customer retention and expansion.',
  },
  boarding: {
    phonetic: '/ˈbɔːdɪŋ/',
    partOfSpeech: 'noun',
    definition: 'The action of getting on or into a ship, aircraft, or other vehicle.',
    spanish: 'embarque',
    example: 'Boarding starts forty-five minutes before departure.',
  },
  luggage: {
    phonetic: '/ˈlʌɡɪdʒ/',
    partOfSpeech: 'noun',
    definition: 'Suitcases or other bags in which to pack personal belongings for traveling.',
    spanish: 'equipaje',
    example: 'Please place your hand luggage in the overhead bin.',
  },
  fluent: {
    phonetic: '/ˈfluːənt/',
    partOfSpeech: 'adjective',
    definition: 'Able to express oneself easily and articulately in a foreign language.',
    spanish: 'fluido / con soltura',
    example: 'Practicing shadowing every day helps you become fluent.',
  },
  pronunciation: {
    phonetic: '/prəˌnʌnsiˈeɪʃən/',
    partOfSpeech: 'noun',
    definition: 'The way in which a word is pronounced according to standard phonetic conventions.',
    spanish: 'pronunciación',
    example: 'Listen closely to the audio to mimic the native pronunciation.',
  },
  comprehension: {
    phonetic: '/ˌkɒmprɪˈhenʃən/',
    partOfSpeech: 'noun',
    definition: 'The action or capability of understanding something.',
    spanish: 'comprensión',
    example: 'Reading along with the audio boosts listening comprehension.',
  },
  intricate: {
    phonetic: '/ˈɪntrɪkət/',
    partOfSpeech: 'adjective',
    definition: 'Very complicated or detailed in design or structure.',
    spanish: 'complejo / intrincado',
    example: 'The architecture featured intricate stone carvings.',
  },
  schedule: {
    phonetic: '/ˈskedʒuːl/',
    partOfSpeech: 'noun',
    definition: 'A plan for carrying out a process or procedure, giving lists of intended events and times.',
    spanish: 'horario / agenda',
    example: 'Let us check our schedule for tomorrow morning.',
  },
  recommend: {
    phonetic: '/ˌrekəˈmend/',
    partOfSpeech: 'verb',
    definition: 'Put forward with approval as being suitable for a particular purpose or role.',
    spanish: 'recomendar',
    example: 'What dish do you recommend for dinner?',
  },
  experience: {
    phonetic: '/ɪkˈspɪəriəns/',
    partOfSpeech: 'noun',
    definition: 'Practical contact with and observation of facts or events.',
    spanish: 'experiencia',
    example: 'He has five years of project management experience.',
  },
  colleague: {
    phonetic: '/ˈkɒliːɡ/',
    partOfSpeech: 'noun',
    definition: 'A person with whom one works in a profession or business.',
    spanish: 'colega / compañero de trabajo',
    example: 'Allow me to introduce you to my colleague Sarah.',
  },
  opportunity: {
    phonetic: '/ˌɒpəˈtjuːnəti/',
    partOfSpeech: 'noun',
    definition: 'A set of circumstances that makes it possible to do something.',
    spanish: 'oportunidad',
    example: 'This internship is an excellent learning opportunity.',
  },
  conversation: {
    phonetic: '/ˌkɒnvəˈseɪʃən/',
    partOfSpeech: 'noun',
    definition: 'A talk, especially an informal one, between two or more people.',
    spanish: 'conversación',
    example: 'Listening to casual conversations improves your ear.',
  },
};

export async function lookupWord(rawWord: string, contextSentence?: string): Promise<WordDefinitionResult> {
  const clean = rawWord
    .trim()
    .replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»“”]+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»“”]+$/g, '')
    .trim();

  if (!clean) {
    return {
      word: rawWord,
      definition: 'No definition available',
      spanish: rawWord,
    };
  }

  const lower = clean.toLowerCase();

  // If no context sentence was passed and word is in built-in vocab, respond instantly
  if (!contextSentence && BUILTIN_VOCAB[lower]) {
    const entry = BUILTIN_VOCAB[lower];
    return {
      word: lower,
      phonetic: entry.phonetic,
      partOfSpeech: entry.partOfSpeech,
      definition: entry.definition,
      spanish: entry.spanish,
      example: entry.example,
    };
  }

  // Primary: Call server-side vocabulary inspection service (Gemini AI + Lexicography Cache)
  try {
    const res = await fetch('/api/lookup-word', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        word: clean,
        contextSentence: contextSentence || '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.definition && data.spanish) {
        return {
          word: data.word || clean,
          phonetic: data.phonetic || `/${clean}/`,
          partOfSpeech: data.partOfSpeech || 'term',
          definition: data.definition,
          spanish: data.spanish,
          example: data.example || '',
          audioUrl: data.audioUrl || '',
        };
      }
    }
  } catch (err) {
    console.warn('Server vocabulary lookup unavailable, falling back:', err);
  }

  // Secondary Fallback: Built-in vocabulary
  if (BUILTIN_VOCAB[lower]) {
    const entry = BUILTIN_VOCAB[lower];
    return {
      word: lower,
      phonetic: entry.phonetic,
      partOfSpeech: entry.partOfSpeech,
      definition: entry.definition,
      spanish: entry.spanish,
      example: entry.example,
    };
  }

  // Tertiary Fallback: Public Dictionary API + MyMemory bilingual translation
  let phonetic = `/${lower}/`;
  let partOfSpeech = 'word';
  let definition = '';
  let example = '';
  let audioUrl = '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lower)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        phonetic = item.phonetic || item.phonetics?.find((p: any) => p.text)?.text || phonetic;
        audioUrl = item.phonetics?.find((p: any) => p.audio && p.audio.length > 0)?.audio || '';
        const meaning = item.meanings?.[0];
        partOfSpeech = meaning?.partOfSpeech || partOfSpeech;
        definition = meaning?.definitions?.[0]?.definition || '';
        example = meaning?.definitions?.[0]?.example || '';
      }
    }
  } catch (err) {
    // Network or timeout
  }

  // Translation lookup via MyMemory
  let spanish = '';
  try {
    const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(lower)}&langpair=en|es`);
    if (transRes.ok) {
      const transData = await transRes.json();
      if (transData.responseData?.translatedText) {
        spanish = transData.responseData.translatedText;
      }
    }
  } catch (e) {}

  if (!spanish) {
    spanish = lower;
  }
  if (!definition) {
    definition = `English word "${clean}". Translation: ${spanish}.`;
  }
  if (!example && contextSentence) {
    example = contextSentence;
  }

  return {
    word: clean,
    phonetic,
    partOfSpeech,
    definition,
    spanish,
    example,
    audioUrl,
  };
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudio: HTMLAudioElement | null = null;

export function playWordSpeech(word: string, accent: 'US' | 'UK' = 'US', audioUrl?: string) {
  // If native audio file exists from dictionary, play it with highest fidelity
  if (audioUrl) {
    try {
      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }
      activeAudio = new Audio(audioUrl);
      activeAudio.play().catch(() => {
        speakWithSynthesis(word, accent);
      });
      return;
    } catch (e) {
      // fallback to synthesis
    }
  }

  speakWithSynthesis(word, accent);
}

function speakWithSynthesis(word: string, accent: 'US' | 'UK' = 'US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    const cleanWord = word
      .replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»“”]+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»“”]+$/g, '')
      .trim();

    if (!cleanWord) return;

    const utterance = new SpeechSynthesisUtterance(cleanWord);
    // Keep reference in module-level variable to prevent Chrome V8 garbage collection mid-speech
    activeUtterance = utterance;

    utterance.lang = accent === 'UK' ? 'en-GB' : 'en-US';
    // Clear, natural and calm cadence for learners (0.8 rate instead of rushed)
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const targetLang = accent === 'UK' ? 'en-GB' : 'en-US';
      const exactVoice = voices.find(v => 
        (v.lang === targetLang || v.lang.replace('_', '-') === targetLang) &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Enhanced') || !v.localService)
      ) || voices.find(v => 
        v.lang.startsWith(accent === 'UK' ? 'en-GB' : 'en-US') || v.lang.startsWith('en')
      );

      if (exactVoice) {
        utterance.voice = exactVoice;
      }
    }

    utterance.onend = () => {
      activeUtterance = null;
    };
    utterance.onerror = () => {
      activeUtterance = null;
    };

    // Timeout after cancel() prevents clipped/stuttering audio start in Chrome/Linux
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 60);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
