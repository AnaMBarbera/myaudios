import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIOS_DIR)) {
  fs.mkdirSync(AUDIOS_DIR, { recursive: true });
}

/**
 * Endpoint to get server-persisted library (audios, lessons, levels, deletions)
 */
app.get('/api/library', async (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(LIBRARY_FILE)) {
      const content = await fs.promises.readFile(LIBRARY_FILE, 'utf-8');
      return res.json(JSON.parse(content));
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
    return res.json({ success: true, savedAt: Date.now() });
  } catch (err: any) {
    console.error('Error saving server library:', err);
    return res.status(500).json({ error: 'Failed to save server library', details: err?.message });
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
