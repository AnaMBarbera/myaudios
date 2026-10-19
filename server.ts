import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeApp as initFirebaseApp } from 'firebase/app';
import {
  getFirestore as getFirestoreServer,
  doc as docServer,
  getDoc as getDocServer,
  setDoc as setDocServer,
  deleteDoc as deleteDocServer,
  collection as collectionServer,
  getDocs as getDocsServer,
} from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DATA_DIR = path.resolve(__dirname, 'data');
const LIBRARY_FILE = path.resolve(DATA_DIR, 'library.json');
const AUDIOS_DIR = path.resolve(DATA_DIR, 'audios');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const CONFIG_FILE = path.resolve(__dirname, 'firebase-applet-config.json');

// Initialize Firebase Firestore on Server for persistent cloud storage
let firestoreDb: any = null;
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const serverApp = initFirebaseApp(config, 'zona-sonora-server');
    firestoreDb = getFirestoreServer(serverApp, config.firestoreDatabaseId);
    console.log('[Firestore] Connected to Firebase Firestore database:', config.firestoreDatabaseId);
  } catch (e) {
    console.warn('[Firestore] Error initializing Firebase on server:', e);
  }
}

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIOS_DIR)) {
  fs.mkdirSync(AUDIOS_DIR, { recursive: true });
}

// Default initial users representing the 3 system roles
const DEFAULT_USERS = [
  {
    id: 'user_admin_1',
    username: 'admin',
    name: 'Ana Barberá (Admin)',
    email: 'anabarbera90@gmail.com',
    role: 'admin',
    password: 'admin',
    createdAt: 1718000000000,
    isActive: true,
    notes: 'Super Administrador del sistema con acceso completo',
  },
  {
    id: 'user_teacher_1',
    username: 'profesor',
    name: 'Carlos Méndez (Profesor)',
    email: 'carlos.mendez@lingosync.com',
    role: 'teacher',
    password: 'profe',
    createdAt: 1718000000000,
    isActive: true,
    notes: 'Profesor y editor: gestión de lecciones, audios y alumnos',
  },
  {
    id: 'user_student_1',
    username: 'alumno',
    name: 'Sofía Navarro (Alumna)',
    email: 'sofia.navarro@student.com',
    role: 'student',
    password: 'alumno',
    createdAt: 1718000000000,
    isActive: true,
    notes: 'Alumna lectora nivel B1',
    enrolledCourseIds: ['ingles_b1'],
  },
];

async function readUsers() {
  if (firestoreDb) {
    try {
      const snap = await getDocsServer(collectionServer(firestoreDb, 'users'));
      if (!snap.empty) {
        const users: any[] = [];
        snap.forEach((d) => users.push(d.data()));
        // Keep local cache file updated
        await fs.promises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
        return users;
      }
    } catch (err) {
      console.warn('[Firestore] Error reading users from Firestore:', err);
    }
  }

  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = await fs.promises.readFile(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (firestoreDb && Array.isArray(parsed) && parsed.length > 0) {
        // Seed to Firestore
        for (const u of parsed) {
          if (u && u.id) {
            setDocServer(docServer(firestoreDb, 'users', u.id), u).catch(() => {});
          }
        }
      }
      return parsed;
    } catch (e) {
      console.error('Error reading users file:', e);
    }
  }

  await fs.promises.writeFile(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
  if (firestoreDb) {
    for (const u of DEFAULT_USERS) {
      setDocServer(docServer(firestoreDb, 'users', u.id), u).catch(() => {});
    }
  }
  return DEFAULT_USERS;
}

async function writeUsers(users: any[]) {
  await fs.promises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  if (firestoreDb && Array.isArray(users)) {
    try {
      for (const u of users) {
        if (u && u.id) {
          await setDocServer(docServer(firestoreDb, 'users', u.id), u);
        }
      }
    } catch (err) {
      console.warn('[Firestore] Error syncing users to Firestore:', err);
    }
  }
}

/**
 * Endpoint to get server-persisted library (audios, lessons, levels, deletions)
 */
app.get('/api/library', async (_req: Request, res: Response) => {
  try {
    if (firestoreDb) {
      try {
        const metaDoc = await getDocServer(docServer(firestoreDb, 'library_meta', 'current'));
        if (metaDoc.exists()) {
          const libraryData = metaDoc.data();
          await fs.promises.writeFile(LIBRARY_FILE, JSON.stringify(libraryData, null, 2), 'utf-8');
          return res.json(libraryData);
        }
      } catch (err) {
        console.warn('[Firestore] Error reading library from Firestore:', err);
      }
    }

    if (fs.existsSync(LIBRARY_FILE)) {
      const content = await fs.promises.readFile(LIBRARY_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (firestoreDb && parsed && (parsed.items?.length > 0 || parsed.lessons?.length > 0)) {
        setDocServer(docServer(firestoreDb, 'library_meta', 'current'), parsed).catch(() => {});
      }
      return res.json(parsed);
    }
    return res.json({ initialized: false, items: [], levels: [], lessons: [], deletedItemIds: [], deletedLessonIds: [] });
  } catch (err: any) {
    console.error('Error reading server library:', err);
    return res.status(500).json({ error: 'Failed to read server library', details: err?.message });
  }
});

/**
 * Endpoint to save server-persisted library so changes are stored across URLs, devices and sessions
 */
app.post('/api/library', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    await fs.promises.writeFile(LIBRARY_FILE, JSON.stringify(payload, null, 2), 'utf-8');

    if (firestoreDb) {
      try {
        await setDocServer(docServer(firestoreDb, 'library_meta', 'current'), payload);
        if (Array.isArray(payload.items)) {
          for (const item of payload.items) {
            if (item && item.id) {
              await setDocServer(docServer(firestoreDb, 'audios', item.id), item);
            }
          }
        }
        if (Array.isArray(payload.lessons)) {
          for (const lesson of payload.lessons) {
            if (lesson && lesson.id) {
              await setDocServer(docServer(firestoreDb, 'lessons', lesson.id), lesson);
            }
          }
        }
        if (Array.isArray(payload.levels)) {
          for (const level of payload.levels) {
            if (level && level.id) {
              await setDocServer(docServer(firestoreDb, 'courses', level.id), level);
            }
          }
        }
      } catch (err) {
        console.warn('[Firestore] Error persisting library to Firestore:', err);
      }
    }

    return res.json({ success: true, savedAt: Date.now() });
  } catch (err: any) {
    console.error('Error saving server library:', err);
    return res.status(500).json({ error: 'Failed to save server library', details: err?.message });
  }
});

/**
 * Auth API: Login
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const users = await readUsers();
    const user = users.find((u: any) => 
      u.username.toLowerCase() === username.trim().toLowerCase() && 
      (u.password === password || u.password === password.trim())
    );

    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Esta cuenta de usuario está desactivada por el administrador' });
    }

    user.lastLoginAt = Date.now();
    await writeUsers(users);

    const { password: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Error en el inicio de sesión', details: err?.message });
  }
});

/**
 * Auth API: Google Login (Firebase Auth integration)
 */
app.post('/api/auth/google-login', async (req: Request, res: Response) => {
  try {
    const { email, name, uid } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email de Google requerido' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = await readUsers();
    let user = users.find((u: any) => u.email && u.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      const isAdminEmail = cleanEmail === 'anabarbera90@gmail.com';
      user = {
        id: `user_${uid || Date.now()}`,
        username: cleanEmail.split('@')[0],
        name: name || (isAdminEmail ? 'Ana Barberá (Admin)' : 'Usuario'),
        email: cleanEmail,
        role: isAdminEmail ? 'admin' : 'student',
        createdAt: Date.now(),
        isActive: true,
        notes: isAdminEmail ? 'Administrador verificado vía Google' : 'Estudiante registrado vía Google',
        enrolledCourseIds: ['ingles_b1'],
      };
      users.push(user);
      await writeUsers(users);
    } else {
      user.lastLoginAt = Date.now();
      await writeUsers(users);
    }

    const { password: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error('Google login API error:', err);
    return res.status(500).json({ error: 'Error al procesar login de Google', details: err?.message });
  }
});

/**
 * Users API: Get all users
 */
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const users = await readUsers();
    // Return users without exposing raw password in standard listing
    const safeUsers = users.map(({ password: _, ...rest }: any) => rest);
    return res.json(safeUsers);
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ error: 'Error al obtener usuarios', details: err?.message });
  }
});

/**
 * Users API: Create a new user (admin / teacher managed)
 */
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { username, name, email, role, password, notes, enrolledCourseIds } = req.body;
    if (!username || !name || !role) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (usuario, nombre o rol)' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const users = await readUsers();

    if (users.some((u: any) => u.username.toLowerCase() === cleanUsername)) {
      return res.status(409).json({ error: `El nombre de usuario "${username}" ya existe` });
    }

    const newUser = {
      id: `user_${Date.now()}_${cleanUsername}`,
      username: cleanUsername,
      name: name.trim(),
      email: email ? email.trim() : '',
      role: ['admin', 'teacher', 'student'].includes(role) ? role : 'student',
      password: password ? password.trim() : '123456',
      createdAt: Date.now(),
      isActive: true,
      notes: notes ? notes.trim() : '',
      enrolledCourseIds: Array.isArray(enrolledCourseIds) ? enrolledCourseIds : [],
    };

    users.push(newUser);
    await writeUsers(users);

    const { password: _, ...safeUser } = newUser;
    return res.status(201).json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return res.status(500).json({ error: 'Error al registrar el usuario', details: err?.message });
  }
});

/**
 * Users API: Update user
 */
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, isActive, notes, enrolledCourseIds } = req.body;

    const users = await readUsers();
    const index = users.findIndex((u: any) => u.id === id);

    if (index < 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const current = users[index];
    if (name) current.name = name.trim();
    if (email !== undefined) current.email = email.trim();
    if (role && ['admin', 'teacher', 'student'].includes(role)) current.role = role;
    if (password) current.password = password.trim();
    if (isActive !== undefined) current.isActive = Boolean(isActive);
    if (notes !== undefined) current.notes = notes.trim();
    if (enrolledCourseIds !== undefined && Array.isArray(enrolledCourseIds)) {
      current.enrolledCourseIds = enrolledCourseIds;
    }

    await writeUsers(users);

    const { password: _, ...safeUser } = current;
    return res.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error('Error updating user:', err);
    return res.status(500).json({ error: 'Error al actualizar usuario', details: err?.message });
  }
});

/**
 * Users API: Delete user (admin only)
 */
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const users = await readUsers();
    const userToDelete = users.find((u: any) => u.id === id);

    if (!userToDelete) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Protect last admin from accidental deletion
    if (userToDelete.role === 'admin') {
      const adminCount = users.filter((u: any) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el único administrador del sistema' });
      }
    }

    const filtered = users.filter((u: any) => u.id !== id);
    await writeUsers(filtered);
    if (firestoreDb) {
      try {
        await deleteDocServer(docServer(firestoreDb, 'users', id));
      } catch (err) {
        console.warn('[Firestore] Error deleting user in Firestore:', err);
      }
    }

    return res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: 'Error al eliminar usuario', details: err?.message });
  }
});

/**
 * Endpoint to upload an audio blob so it is available across all URLs and devices
 */
app.post('/api/audio-blob', async (req: Request, res: Response) => {
  try {
    const { id, mimeType, base64 } = req.body;
    if (!id || !base64) {
      return res.status(400).json({ error: 'Missing id or base64 data' });
    }
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.resolve(AUDIOS_DIR, `${safeId}.bin`);
    const metaPath = path.resolve(AUDIOS_DIR, `${safeId}.json`);

    const buffer = Buffer.from(base64, 'base64');
    await fs.promises.writeFile(filePath, buffer);
    await fs.promises.writeFile(metaPath, JSON.stringify({ mimeType: mimeType || 'audio/mpeg', size: buffer.length }), 'utf-8');

    return res.json({ success: true, id: safeId, size: buffer.length });
  } catch (err: any) {
    console.error('Error saving audio blob on server:', err);
    return res.status(500).json({ error: 'Failed to save audio blob', details: err?.message });
  }
});

/**
 * Endpoint to stream server-persisted audio blob
 */
app.get('/api/audio-blob/:id', async (req: Request, res: Response) => {
  try {
    const safeId = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.resolve(AUDIOS_DIR, `${safeId}.bin`);
    const metaPath = path.resolve(AUDIOS_DIR, `${safeId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Audio file not found on server');
    }

    let mimeType = 'audio/mpeg';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'));
        if (meta.mimeType) mimeType = meta.mimeType;
      } catch (e) {}
    }

    const stat = await fs.promises.stat(filePath);
    const total = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': total,
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error('Error serving audio blob:', err);
    return res.status(500).send('Error serving audio');
  }
});

/**
 * Proxy for Google Drive files and Google Docs to avoid CORS issues and support Range headers for audio seeking
 */
app.get('/api/drive-proxy', async (req: Request, res: Response) => {
  const fileId = req.query.id as string | undefined;
  const rawUrl = req.query.url as string | undefined;
  const type = (req.query.type as string | undefined) || 'audio';

  let targetUrl = '';

  if (fileId) {
    if (type === 'doc') {
      targetUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
    } else {
      // Direct stream download URL for Google Drive
      targetUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  } else if (rawUrl) {
    targetUrl = decodeURIComponent(rawUrl);
  }

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing id or url parameter' });
  }

  try {
    const rangeHeader = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (rangeHeader && type === 'audio') {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstreamResponse = await fetch(targetUrl, {
      headers: fetchHeaders,
      redirect: 'follow',
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      // Try fallback to drive.usercontent.google.com directly if uc?export=download hit a confirmation or error
      if (fileId) {
        const altUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
        const altResponse = await fetch(altUrl, {
          headers: fetchHeaders,
          redirect: 'follow',
        });
        if (altResponse.ok || altResponse.status === 206) {
          return pipeUpstreamResponse(altResponse, res, type);
        }
      }
      return res.status(upstreamResponse.status).send(`Upstream error: ${upstreamResponse.statusText}`);
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    // If Google Drive returned an HTML warning/confirmation page instead of the actual media file
    if ((type === 'audio' || type === 'text' || type === 'vtt') && contentType.includes('text/html') && fileId) {
      const altUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
      const altResponse = await fetch(altUrl, {
        headers: fetchHeaders,
        redirect: 'follow',
      });
      if (altResponse.ok || altResponse.status === 206) {
        return pipeUpstreamResponse(altResponse, res, type);
      }
    }

    return pipeUpstreamResponse(upstreamResponse, res, type);
  } catch (err: any) {
    console.error('Drive proxy error:', err);
    return res.status(500).json({ error: 'Failed to proxy file from Google Drive', details: err?.message });
  }
});

// Gemini Client initialization for intelligent bilingual lexicography & vocabulary inspector
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory cache for fast repeated lookups
const vocabularyCache = new Map<string, any>();

/**
 * Endpoint for Vocabulary Inspector:
 * Accurate Spanish translation, natural English definition, precise phonetic IPA, and illustrative example sentence.
 * Uses Gemini AI with server-side proxy and automatic fallback to bilingual dictionary services.
 */
app.post('/api/lookup-word', async (req: Request, res: Response) => {
  try {
    const { word, contextSentence } = req.body;
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word parameter is required' });
    }

    const cleanWord = word
      .trim()
      .toLowerCase()
      .replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»“”]+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»“”]+$/g, '');

    if (!cleanWord) {
      return res.status(400).json({ error: 'A valid word is required' });
    }

    const cacheKey = `${cleanWord}:${(contextSentence || '').trim().slice(0, 80)}`;
    if (vocabularyCache.has(cacheKey)) {
      return res.json(vocabularyCache.get(cacheKey));
    }

    // Tier 1: Gemini AI powered lexicography (ideal for context-aware translations & definitions)
    if (aiClient) {
      try {
        const prompt = `You are an expert bilingual English-Spanish lexicographer and teacher for language learners.
Analyze the English word or phrase: "${cleanWord}"${contextSentence ? ` as used in this sentence: "${contextSentence}"` : ''}.
Return a structured JSON with:
- word: the term (in lowercase/canonical or inflected form as appropriate)
- phonetic: accurate IPA phonetic transcription (e.g., /ˈbentʃmɑːrk/ or /ˌrezərˈveɪʃn/)
- partOfSpeech: grammatical category (e.g., noun, verb, adjective, adverb, phrasal verb, idiom)
- spanish: natural and precise Spanish translation matching this context (concise label or short alternative phrase, e.g., "punto de referencia / estándar" or "reunión / cita", avoid lengthy explanations)
- definition: clear, simple, and accurate English definition explaining what it means in plain English
- example: a natural, helpful example sentence in English showing real-world usage`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
                definition: { type: Type.STRING },
                spanish: { type: Type.STRING },
                example: { type: Type.STRING },
              },
              required: ['word', 'phonetic', 'partOfSpeech', 'definition', 'spanish', 'example'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed && parsed.definition && parsed.spanish) {
            vocabularyCache.set(cacheKey, parsed);
            return res.json(parsed);
          }
        }
      } catch (geminiError) {
        console.warn('[Gemini] Vocabulary analysis error, falling back to dictionary services:', geminiError);
      }
    }

    // Tier 2: Free Dictionary API + MyMemory bilingual translation fallback
    let phonetic = `/${cleanWord}/`;
    let partOfSpeech = 'word';
    let definition = '';
    let example = '';
    let audioUrl = '';

    try {
      const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        if (Array.isArray(dictData) && dictData[0]) {
          phonetic = dictData[0].phonetic || dictData[0].phonetics?.find((p: any) => p.text)?.text || phonetic;
          audioUrl = dictData[0].phonetics?.find((p: any) => p.audio && p.audio.length > 0)?.audio || '';
          const meaning = dictData[0].meanings?.[0];
          partOfSpeech = meaning?.partOfSpeech || partOfSpeech;
          definition = meaning?.definitions?.[0]?.definition || '';
          example = meaning?.definitions?.[0]?.example || '';
        }
      }
    } catch (e) {}

    // Spanish translation query
    let spanish = '';
    try {
      const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|es`);
      if (transRes.ok) {
        const transData = await transRes.json();
        if (transData.responseData?.translatedText) {
          spanish = transData.responseData.translatedText.toLowerCase();
        }
      }
    } catch (e) {}

    if (!spanish || spanish.toLowerCase() === cleanWord) {
      spanish = cleanWord;
    }
    if (!definition) {
      definition = `English word: "${cleanWord}". Meaning: ${spanish}.`;
    }
    if (!example && contextSentence) {
      example = contextSentence;
    }

    const fallbackResult = {
      word: cleanWord,
      phonetic,
      partOfSpeech,
      definition,
      spanish,
      example,
      audioUrl,
    };

    vocabularyCache.set(cacheKey, fallbackResult);
    return res.json(fallbackResult);
  } catch (err: any) {
    console.error('Vocabulary lookup error:', err);
    return res.status(500).json({ error: 'Failed to lookup vocabulary word', details: err?.message });
  }
});

async function pipeUpstreamResponse(upstreamResponse: globalThis.Response, res: Response, type: string) {
  // Forward status
  res.status(upstreamResponse.status);

  // Set appropriate content-type
  const contentType = upstreamResponse.headers.get('content-type');
  if (type === 'audio') {
    res.setHeader('Content-Type', contentType && contentType.includes('audio') ? contentType : 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
  } else if (type === 'vtt') {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
  } else if (type === 'text' || type === 'doc') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  } else if (contentType) {
    res.setHeader('Content-Type', contentType);
  }

  const contentLength = upstreamResponse.headers.get('content-length');
  if (contentLength) res.setHeader('Content-Length', contentLength);

  const contentRange = upstreamResponse.headers.get('content-range');
  if (contentRange) res.setHeader('Content-Range', contentRange);

  res.setHeader('Access-Control-Allow-Origin', '*');

  // Stream body
  if (upstreamResponse.body) {
    const reader = upstreamResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } else {
    res.end();
  }
}

async function startServer() {
  // Serve public static assets (favicon.svg, apple-touch-icon.png, manifest.json, etc.)
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LingoSync server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
