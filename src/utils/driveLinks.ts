/**
 * Helper to parse, extract IDs and generate stream/download URLs for Google Drive files and Google Docs.
 */

export interface ParsedDriveLink {
  fileId: string | null;
  type: 'drive-file' | 'drive-folder' | 'google-doc' | 'google-sheet' | 'generic-url';
  originalUrl: string;
  directStreamUrl: string;
  proxyStreamUrl: string;
  directTextUrl?: string;
  proxyTextUrl?: string;
  isFolder?: boolean;
}

export function parseDriveLink(inputUrl: string): ParsedDriveLink {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    return {
      fileId: null,
      type: 'generic-url',
      originalUrl: '',
      directStreamUrl: '',
      proxyStreamUrl: '',
    };
  }

  // 0. Detect Google Drive Folder (/drive/folders/<ID>)
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    const folderId = folderMatch[1];
    return {
      fileId: folderId,
      type: 'drive-folder',
      isFolder: true,
      originalUrl: trimmed,
      directStreamUrl: '',
      proxyStreamUrl: '',
    };
  }

  // 1. Google Docs Document (/document/d/<ID>)
  const docMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    const fileId = docMatch[1];
    return {
      fileId,
      type: 'google-doc',
      originalUrl: trimmed,
      directStreamUrl: '',
      proxyStreamUrl: `/api/drive-proxy?id=${fileId}&type=doc`,
      directTextUrl: `https://docs.google.com/document/d/${fileId}/export?format=txt`,
      proxyTextUrl: `/api/drive-proxy?id=${fileId}&type=doc`,
    };
  }

  // 2. Google Drive File (/file/d/<ID>)
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    const fileId = fileMatch[1];
    return {
      fileId,
      type: 'drive-file',
      originalUrl: trimmed,
      directStreamUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      proxyStreamUrl: `/api/drive-proxy?id=${fileId}&type=audio`,
      directTextUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      proxyTextUrl: `/api/drive-proxy?id=${fileId}&type=text`,
    };
  }

  // 3. Google Drive ID query param (open?id=<ID> or uc?id=<ID> or ?id=<ID>)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) {
    const fileId = idParamMatch[1];
    return {
      fileId,
      type: 'drive-file',
      originalUrl: trimmed,
      directStreamUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      proxyStreamUrl: `/api/drive-proxy?id=${fileId}&type=audio`,
      directTextUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      proxyTextUrl: `/api/drive-proxy?id=${fileId}&type=text`,
    };
  }

  // 4. Raw alphanumeric Google Drive ID (e.g. 11lm0saJUirSeQz2i4YFU4-cUH9hShlSX)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return {
      fileId: trimmed,
      type: 'drive-file',
      originalUrl: trimmed,
      directStreamUrl: `https://drive.google.com/uc?export=download&id=${trimmed}`,
      proxyStreamUrl: `/api/drive-proxy?id=${trimmed}&type=audio`,
      directTextUrl: `https://drive.google.com/uc?export=download&id=${trimmed}`,
      proxyTextUrl: `/api/drive-proxy?id=${trimmed}&type=text`,
    };
  }

  // 5. Generic direct audio URL (e.g. https://.../audio.mp3)
  return {
    fileId: null,
    type: 'generic-url',
    originalUrl: trimmed,
    directStreamUrl: trimmed,
    proxyStreamUrl: `/api/drive-proxy?url=${encodeURIComponent(trimmed)}&type=audio`,
    directTextUrl: trimmed,
    proxyTextUrl: `/api/drive-proxy?url=${encodeURIComponent(trimmed)}&type=text`,
  };
}

/**
 * Fetches transcript content from a Google Drive or Google Docs URL.
 * Attempts server proxy first, then falls back to direct fetch.
 */
export async function fetchTranscriptFromUrl(inputUrl: string): Promise<string> {
  const parsed = parseDriveLink(inputUrl);

  // Try server proxy first to avoid CORS issues
  if (parsed.proxyTextUrl) {
    try {
      const res = await fetch(parsed.proxyTextUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.includes('<!DOCTYPE html>') && text.trim().length > 0) {
          return text;
        }
      }
    } catch (e) {
      console.warn('Proxy fetch failed, trying direct...', e);
    }
  }

  // Try direct text URL
  if (parsed.directTextUrl) {
    try {
      const res = await fetch(parsed.directTextUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.includes('<!DOCTYPE html>')) {
          return text;
        }
      }
    } catch (e) {
      console.warn('Direct fetch failed:', e);
    }
  }

  throw new Error('No se pudo descargar automáticamente la transcripción desde el enlace. Asegúrate de que el archivo tenga permiso "Cualquiera con el enlace puede ver" o pega el texto directamente.');
}
