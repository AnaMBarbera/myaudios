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

export async function lookupWord(rawWord: string): Promise<WordDefinitionResult> {
  const clean = rawWord.toLowerCase().replace(/[^a-z'-]/g, '').trim();
  if (!clean) {
    return {
      word: rawWord,
      definition: 'No definition available',
      spanish: rawWord,
    };
  }

  // Check built-in lookup first
  if (BUILTIN_VOCAB[clean]) {
    const entry = BUILTIN_VOCAB[clean];
    return {
      word: clean,
      phonetic: entry.phonetic,
      partOfSpeech: entry.partOfSpeech,
      definition: entry.definition,
      spanish: entry.spanish,
      example: entry.example,
    };
  }

  // Try public dictionary API with fast timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const phonetic = item.phonetic || item.phonetics?.find((p: any) => p.text)?.text || '';
        const audioUrl = item.phonetics?.find((p: any) => p.audio && p.audio.length > 0)?.audio || '';
        const meaning = item.meanings?.[0];
        const definition = meaning?.definitions?.[0]?.definition || 'Definition found in dictionary.';
        const example = meaning?.definitions?.[0]?.example || '';
        const partOfSpeech = meaning?.partOfSpeech || '';

        return {
          word: clean,
          phonetic,
          partOfSpeech,
          definition,
          spanish: generateApproxSpanishHint(clean),
          example,
          audioUrl,
        };
      }
    }
  } catch (err) {
    // network or abort, use fallback
  }

  // Graceful fallback
  return {
    word: clean,
    phonetic: `/${clean}/`,
    partOfSpeech: 'word',
    definition: `English term: "${clean}". Use browser speech button to listen to exact pronunciation.`,
    spanish: generateApproxSpanishHint(clean),
    example: `Pay attention to how "${clean}" is spoken in this audio track.`,
  };
}

function generateApproxSpanishHint(word: string): string {
  // Common cognate pattern hints
  if (word.endsWith('tion')) return word.replace(/tion$/, 'ción');
  if (word.endsWith('ty')) return word.replace(/ty$/, 'dad');
  if (word.endsWith('ly')) return word.replace(/ly$/, 'mente');
  if (word.endsWith('al')) return word;
  if (word.endsWith('ble')) return word;
  return word;
}

export function playWordSpeech(word: string, accent: 'US' | 'UK' = 'US') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accent === 'UK' ? 'en-GB' : 'en-US';
  utterance.rate = 0.9;
  
  const voices = window.speechSynthesis.getVoices();
  const targetVoice = voices.find(v => 
    accent === 'UK' 
      ? v.lang.startsWith('en-GB') 
      : (v.lang.startsWith('en-US') || v.lang.startsWith('en'))
  );
  if (targetVoice) {
    utterance.voice = targetVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}
