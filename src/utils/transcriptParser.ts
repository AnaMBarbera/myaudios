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
  // Support both 00:01:23,456 (SRT) and 00:01:23.456 (VTT) and 01:23.45
  const clean = timestamp.trim().replace(',', '.');
  const parts = clean.split(':').map(Number);
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS.mmm
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  return 0;
}

export function parseSRT(content: string): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIdx = 0;
    // Check if line 0 is numeric index
    if (/^\d+$/.test(lines[0].trim())) {
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    const startTime = parseTimestampToSeconds(startStr);
    const endTime = parseTimestampToSeconds(endStr);

    const textLines = lines.slice(timeLineIdx + 1);
    const rawText = textLines.join(' ').replace(/<[^>]+>/g, '').trim();

    if (rawText) {
      let speaker: string | undefined;
      let text = rawText;
      const speakerMatch = rawText.match(/^([A-Za-z0-9_\s]{2,20}):\s*(.*)$/);
      if (speakerMatch) {
        speaker = speakerMatch[1].trim();
        text = speakerMatch[2].trim();
      }

      segments.push({
        id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        startTime,
        endTime: Math.max(startTime + 0.5, endTime),
        speaker,
        text,
      });
    }
  }

  return segments;
}

export function parseVTT(content: string): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const segments: TranscriptSegment[] = [];
  
  let currentStart = 0;
  let currentEnd = 0;
  let currentTextLines: string[] = [];
  let inCue = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('WEBVTT') || line.startsWith('NOTE')) continue;

    if (line.includes('-->')) {
      if (inCue && currentTextLines.length > 0) {
        const fullText = currentTextLines.join(' ').replace(/<[^>]+>/g, '').trim();
        if (fullText) {
          let speaker: string | undefined;
          let text = fullText;
          const speakerMatch = fullText.match(/^([A-Za-z0-9_\s]{2,20}):\s*(.*)$/);
          if (speakerMatch) {
            speaker = speakerMatch[1].trim();
            text = speakerMatch[2].trim();
          }
          segments.push({
            id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            startTime: currentStart,
            endTime: Math.max(currentStart + 0.5, currentEnd),
            speaker,
            text,
          });
        }
        currentTextLines = [];
      }

      const [startStr, endStr] = line.split('-->').map(s => s.trim().split(' ')[0]);
      currentStart = parseTimestampToSeconds(startStr);
      currentEnd = parseTimestampToSeconds(endStr);
      inCue = true;
    } else if (inCue) {
      if (line === '') {
        const fullText = currentTextLines.join(' ').replace(/<[^>]+>/g, '').trim();
        if (fullText) {
          let speaker: string | undefined;
          let text = fullText;
          const speakerMatch = fullText.match(/^([A-Za-z0-9_\s]{2,20}):\s*(.*)$/);
          if (speakerMatch) {
            speaker = speakerMatch[1].trim();
            text = speakerMatch[2].trim();
          }
          segments.push({
            id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            startTime: currentStart,
            endTime: Math.max(currentStart + 0.5, currentEnd),
            speaker,
            text,
          });
        }
        currentTextLines = [];
        inCue = false;
      } else {
        currentTextLines.push(line);
      }
    }
  }

  // Flush remaining
  if (inCue && currentTextLines.length > 0) {
    const fullText = currentTextLines.join(' ').replace(/<[^>]+>/g, '').trim();
    if (fullText) {
      let speaker: string | undefined;
      let text = fullText;
      const speakerMatch = fullText.match(/^([A-Za-z0-9_\s]{2,20}):\s*(.*)$/);
      if (speakerMatch) {
        speaker = speakerMatch[1].trim();
        text = speakerMatch[2].trim();
      }
      segments.push({
        id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        startTime: currentStart,
        endTime: Math.max(currentStart + 0.5, currentEnd),
        speaker,
        text,
      });
    }
  }

  return segments;
}

export function parsePlainText(content: string, audioDuration?: number): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Try splitting by paragraph or sentence ends
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
      id: `seg_${Date.now()}_${idx}`,
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
    const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : '';
    return `${startStr} --> ${endStr}\n${speakerPrefix}${seg.text}\n`;
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
