import { TranscriptSegment } from '../types';

export function formatTime(seconds: number, includeMs: boolean = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const formattedMins = mins.toString().padStart(2, '0');
  const formattedSecs = secs.toString().padStart(2, '0');
  
  if (includeMs) {
    const ms = Math.floor((seconds % 1) * 10);
    return `${formattedMins}:${formattedSecs}.${ms}`;
  }
  return `${formattedMins}:${formattedSecs}`;
}

export function parseTimestampToSeconds(timestamp: string): number {
  if (!timestamp) return 0;
  // Clean whitespace, comma to dot, and any cue settings (like line:0, align:center, etc)
  const token = timestamp.trim().replace(',', '.').split(/\s+/)[0];
  const parts = token.split(':').map(Number);
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  } else if (parts.length === 2) {
    // MM:SS.mmm
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  return 0;
}

/**
 * Clean VTT/HTML tags like <v Speaker>, <c.color>, <i>, <b>, inline timestamps <00:12.000>
 */
export function cleanVTTText(rawText: string): { speaker?: string; text: string } {
  let speaker: string | undefined;
  let text = rawText;

  // Check WebVTT voice tag <v Speaker Name> or <v.narrator Speaker>
  const vTagMatch = text.match(/<v(?:\.[^>]+)?\s+([^>]+)>([\s\S]*?)<\/v>/i) ||
                     text.match(/<v(?:\.[^>]+)?\s+([^>]+)>([\s\S]*)$/i);
  if (vTagMatch) {
    speaker = vTagMatch[1].trim();
    text = vTagMatch[2].trim();
  }

  // Strip all other HTML/VTT tags like <c.yellow>, <i>, </b>, <00:01.000>, etc.
  text = text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

  // If speaker wasn't in <v> tag, check if line starts with Speaker Name:
  if (!speaker) {
    const speakerMatch = text.match(/^([A-Za-z0-9_\s]{2,25}):\s*(.*)$/);
    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      text = speakerMatch[2].trim();
    }
  }

  return { speaker, text };
}

/**
 * Comprehensive WebVTT Parser
 * Preserves the exact timestamps of every cue block without modifying them or splitting into phrases.
 * Supports Google Docs normalized dashes (en-dash and em-dash to -->) and all WebVTT variants.
 */
export function parseVTT(content: string): TranscriptSegment[] {
  // Strip UTF-8 BOM if present, normalize dashes that Google Docs auto-converts, and normalize newlines
  const normalized = content
    .replace(/^\uFEFF/, '')
    .replace(/[—–]>/g, '-->')
    .replace(/--\s*>/g, '-->')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const segments: TranscriptSegment[] = [];
  const lines = normalized.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // Skip WEBVTT header line or comments/regions/styles
    const upperLine = line.toUpperCase();
    if (
      upperLine.startsWith('WEBVTT') || 
      upperLine.startsWith('NOTE') || 
      upperLine.startsWith('STYLE') || 
      upperLine.startsWith('REGION') ||
      upperLine.startsWith('KIND:') ||
      upperLine.startsWith('LANGUAGE:')
    ) {
      i++;
      // Skip until blank line if it was a block like NOTE, STYLE, REGION
      if (upperLine.startsWith('NOTE') || upperLine.startsWith('STYLE') || upperLine.startsWith('REGION')) {
        while (i < lines.length && lines[i].trim() !== '') {
          i++;
        }
      }
      continue;
    }

    // Check if this line contains the cue arrow '-->' or if next line contains it (with current line being cue ID)
    let timeLine = '';
    let cueIdFromLine = '';

    if (line.includes('-->')) {
      timeLine = line;
      i++;
    } else if (i + 1 < lines.length && lines[i + 1].includes('-->')) {
      // Current line was a cue identifier (e.g. "1" or "cue-01" or speaker title)
      cueIdFromLine = line;
      timeLine = lines[i + 1].trim();
      i += 2;
    } else {
      i++;
      continue;
    }

    // Extract start and end times
    const [startRaw, endRaw] = timeLine.split('-->');
    if (!startRaw || !endRaw) continue;

    const startTime = parseTimestampToSeconds(startRaw.trim());
    const endTime = parseTimestampToSeconds(endRaw.trim());

    // Collect text payload lines until next blank line or next cue
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
      // Check if next line contains '-->', meaning current line is actually the cue ID of the next cue
      if (i + 1 < lines.length && lines[i + 1].includes('-->')) {
        break;
      }
      textLines.push(lines[i].trim());
      i++;
    }

    const rawPayload = textLines.join(' ').trim();
    if (rawPayload) {
      const { speaker, text } = cleanVTTText(rawPayload);
      if (text) {
        segments.push({
          id: `vtt_cue_${segments.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
          startTime,
          endTime: Math.max(startTime + 0.1, endTime),
          speaker: speaker || (cueIdFromLine && isNaN(Number(cueIdFromLine)) ? cueIdFromLine : undefined),
          text,
        });
      }
    }

    // Skip any trailing blank lines
    while (i < lines.length && lines[i].trim() === '') {
      i++;
    }
  }

  return segments;
}

/**
 * Standard SRT Parser
 */
export function parseSRT(content: string): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIdx = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    const startTime = parseTimestampToSeconds(startStr);
    const endTime = parseTimestampToSeconds(endStr);

    const textLines = lines.slice(timeLineIdx + 1);
    const rawText = textLines.join(' ').trim();

    if (rawText) {
      const { speaker, text } = cleanVTTText(rawText);
      if (text) {
        segments.push({
          id: `srt_${Date.now()}_${segments.length}_${Math.random().toString(36).substring(2, 6)}`,
          startTime,
          endTime: Math.max(startTime + 0.1, endTime),
          speaker,
          text,
        });
      }
    }
  }

  return segments;
}

/**
 * Auto-detect format and parse transcript
 * If the content is WebVTT or SRT, it preserves the exact timestamps of every cue.
 * Only if it's plain text without timestamps does it split by sentences.
 */
export function autoDetectAndParseTranscript(
  content: string, 
  audioDuration?: number
): { segments: TranscriptSegment[]; format: 'vtt' | 'srt' | 'plain'; cueCount: number } {
  const cleaned = content.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return { segments: [], format: 'plain', cueCount: 0 };
  }

  const cleanedWithArrow = cleaned.replace(/[—–]>/g, '-->').replace(/--\s*>/g, '-->');
  const upper = cleanedWithArrow.toUpperCase();

  // 1. Check if it's WebVTT: explicit header or timestamp arrow pattern with millisecond dots/colons
  const isVTT = upper.includes('WEBVTT') || 
                cleanedWithArrow.includes('-->') ||
                /-->\s*(?:\d{1,2}:)?\d{1,2}:\d{2}/.test(cleanedWithArrow);

  if (isVTT) {
    const segments = parseVTT(cleanedWithArrow);
    if (segments.length > 0) {
      return { segments, format: 'vtt', cueCount: segments.length };
    }
  }

  // 2. Check if it's SRT: standard 00:00:00,000 --> 00:00:00,000
  const isSRT = /-->\s*\d{1,2}:\d{2}:\d{2}/.test(cleanedWithArrow) || 
                /\d+\s*\n\s*\d{1,2}:\d{2}:\d{2}/.test(cleanedWithArrow);

  if (isSRT) {
    const segments = parseSRT(cleanedWithArrow);
    if (segments.length > 0) {
      return { segments, format: 'srt', cueCount: segments.length };
    }
  }

  // 3. Fallback: Plain text sentence segmentation only if no timestamp cues were found
  const segments = parsePlainText(cleaned, audioDuration);
  return { segments, format: 'plain', cueCount: segments.length };
}

export function parsePlainText(content: string, audioDuration?: number): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawSentences: string[] = [];
  const lines = normalized.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Split sentences inside paragraph
    const matches = trimmed.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        const s = m.trim();
        if (s) rawSentences.push(s);
      }
    } else {
      rawSentences.push(trimmed);
    }
  }

  const total = rawSentences.length;
  if (total === 0) return [];

  const duration = audioDuration && audioDuration > 0 ? audioDuration : total * 4;
  const avgDuration = duration / total;

  return rawSentences.map((sentence, idx) => {
    let speaker: string | undefined;
    let text = sentence;
    const speakerMatch = sentence.match(/^([A-Za-z0-9_\s]{2,20}):\s*(.*)$/);
    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      text = speakerMatch[2].trim();
    }

    const startTime = Number((idx * avgDuration).toFixed(2));
    const endTime = Number(((idx + 1) * avgDuration).toFixed(2));

    return {
      id: `plain_${Date.now()}_${idx}`,
      startTime,
      endTime,
      speaker,
      text,
    };
  });
}

export function exportToSRT(segments: TranscriptSegment[]): string {
  return segments.map((seg, idx) => {
    const startStr = formatSRTTimestamp(seg.startTime);
    const endStr = formatSRTTimestamp(seg.endTime);
    const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : '';
    return `${idx + 1}\n${startStr} --> ${endStr}\n${speakerPrefix}${seg.text}\n`;
  }).join('\n');
}

export function exportToVTT(segments: TranscriptSegment[]): string {
  const body = segments.map(seg => {
    const startStr = formatVTTTimestamp(seg.startTime);
    const endStr = formatVTTTimestamp(seg.endTime);
    const speakerPrefix = seg.speaker ? `<v ${seg.speaker}>` : '';
    const speakerSuffix = seg.speaker ? '</v>' : '';
    return `${startStr} --> ${endStr}\n${speakerPrefix}${seg.text}${speakerSuffix}\n`;
  }).join('\n');

  return `WEBVTT\n\n${body}`;
}

export function exportToTXT(segments: TranscriptSegment[]): string {
  return segments.map(seg => {
    const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : '';
    return `${speakerPrefix}${seg.text}`;
  }).join('\n\n');
}

function formatSRTTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVTTTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
