// Transcriber model layer: xAI Grok Speech-to-Text (/v1/stt).
// Replaces the original Gemini geminiService. The browser NEVER sees the API key:
// it POSTs the media to a same-origin proxy (/api/stt) and nginx injects the
// Authorization header server-side before forwarding to https://api.x.ai/v1/stt.
//
// Exported signatures are unchanged from the Gemini version:
//   fileToBase64(file)                              -> string (base64, no data: prefix)
//   transcribeMedia(base64, mimeType, timestamps)   -> string (formatted transcript)
// so App.tsx needs only its import path updated.

const STT_ENDPOINT = "/api/stt";

interface SttWord {
  text: string;
  start?: number;
  end?: number;
  speaker?: number;
}
interface SttResponse {
  text?: string;
  language?: string;
  duration?: number;
  words?: SttWord[];
}

/** [HH:MM:SS] timestamp from a float seconds value. */
function ts(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `[${pad(h)}:${pad(m)}:${s.toFixed(2).padStart(5, "0")}]`;
}

/**
 * Build a readable transcript from xAI STT word segments. Groups words into
 * speaker turns, breaking on a speaker change or a gap longer than 1.5s.
 * Ported from doc-tender's transcript_text().
 */
function buildTranscript(stt: SttResponse, includeTimestamps: boolean): string {
  const words = stt.words || [];
  if (words.length === 0) {
    return stt.text?.trim() || "(no speech detected)";
  }

  type Turn = { sp?: number; start: number; end: number; text: string };
  const turns: Turn[] = [];
  let cur: Turn | null = null;

  for (const w of words) {
    const sp = w.speaker;
    const st = typeof w.start === "number" ? w.start : 0;
    const en = typeof w.end === "number" ? w.end : st;
    const tx = w.text || "";
    const gap = cur ? st - cur.end : 0;
    if (cur === null || sp !== cur.sp || gap > 1.5) {
      if (cur) turns.push(cur);
      cur = { sp, start: st, end: en, text: tx };
    } else {
      const joiner = ",.?!;:'".includes(tx.charAt(0)) ? "" : " ";
      cur.text += joiner + tx;
      cur.end = en;
    }
  }
  if (cur) turns.push(cur);

  return turns
    .map((t) => {
      const stamp = includeTimestamps ? ts(t.start) + " " : "";
      const speaker = t.sp !== undefined && t.sp !== null ? `Speaker ${t.sp}: ` : "";
      return `${stamp}${speaker}${t.text.trim()}`;
    })
    .join("\n\n");
}

/** base64 (no data: prefix) -> Blob, for multipart upload. */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const clean = base64.includes(",") ? base64.split(",").pop()! : base64;
  const binary = atob(clean);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

function extFor(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("mp4")) return "mp4";
  if (m.includes("m4a")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav") || m.includes("wave")) return "wav";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("opus")) return "opus";
  if (m.includes("flac")) return "flac";
  if (m.includes("aac")) return "aac";
  if (m.includes("webm")) return "webm";
  if (m.includes("matroska") || m.includes("mkv")) return "mkv";
  return "bin";
}

export const transcribeMedia = async (
  base64Data: string,
  mimeType: string,
  includeTimestamps: boolean = true
): Promise<string> => {
  if (!base64Data) {
    throw new Error("Media data is missing or corrupted. Please try re-uploading the file.");
  }

  const byteLength = (base64Data.length * 3) / 4;
  if (byteLength > 500 * 1024 * 1024) {
    throw new Error("The file is too large for direct upload (limit: 500MB).");
  }

  const blob = base64ToBlob(base64Data, mimeType);

  // xAI requires `file` to be the LAST field in the multipart form.
  const form = new FormData();
  form.append("format", "true");
  form.append("language", "en");
  form.append("diarize", "true");
  form.append("file", blob, `upload.${extFor(mimeType)}`);

  let resp: Response;
  try {
    resp = await fetch(STT_ENDPOINT, { method: "POST", body: form });
  } catch (e: any) {
    throw new Error("Could not reach the transcription service. Check that the app's STT proxy is running.");
  }

  if (!resp.ok) {
    let detail = "";
    try {
      detail = await resp.text();
    } catch {
      /* ignore */
    }
    if (resp.status === 413) {
      throw new Error("The file exceeds the 500MB upload limit.");
    }
    if (resp.status === 401) {
      throw new Error("The transcription service rejected the API key. Check XAI_API_KEY on the server.");
    }
    throw new Error(`Transcription failed (HTTP ${resp.status}). ${detail.slice(0, 200)}`);
  }

  let data: SttResponse;
  try {
    data = await resp.json();
  } catch {
    throw new Error("The transcription service returned an unreadable response.");
  }

  const transcript = buildTranscript(data, includeTimestamps);
  if (!transcript || transcript === "(no speech detected)") {
    if (!data.words?.length && !data.text) {
      throw new Error("No speech was detected in this media. Check that it contains audible audio.");
    }
  }
  return transcript;
};

/**
 * Helper to convert a File object to a Base64 string. Chunked to handle large
 * files (up to 500MB) without hitting browser string-length limits.
 * Unchanged from the original service so App.tsx keeps working.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      if (!arrayBuffer) {
        reject(new Error("Failed to read the file contents (buffer is empty)."));
        return;
      }
      try {
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const len = bytes.byteLength;
        const chunk = 0x8000;
        for (let i = 0; i < len; i += chunk) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
        }
        resolve(btoa(binary));
      } catch {
        reject(new Error("Failed to convert file to Base64. The file may be too large for browser memory limits."));
      }
    };
    reader.onerror = () => reject(new Error("Error occurred while reading the file. The file might be locked or inaccessible."));
    reader.readAsArrayBuffer(file);
  });
};
