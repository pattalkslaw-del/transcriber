import { GoogleGenAI } from "@google/genai";

// Ensure API key is present
const apiKey = process.env.API_KEY || '';

/**
 * Transcribes media (audio or video) using Gemini models.
 * 
 * @param base64Data The raw base64 string of the media file
 * @param mimeType The MIME type of the media file
 * @param includeTimestamps Whether to include timestamps in the output
 * @returns The transcribed text
 */
export const transcribeMedia = async (base64Data: string, mimeType: string, includeTimestamps: boolean = true): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  if (!base64Data) {
    throw new Error("Media data is missing or corrupted. Please try re-uploading the file.");
  }

  // Limit check: 500MB.
  const byteLength = (base64Data.length * 3) / 4;
  if (byteLength > 500 * 1024 * 1024) {
    throw new Error("The file is too large for direct upload (limit: 500MB).");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const timestampInstruction = includeTimestamps 
      ? "Include timestamps in [HH:MM:SS] format at the beginning of each paragraph or when a new speaker starts. Ensure they are accurate to the media's timeline."
      : "Do not include any timestamps.";

    // Using gemini-3-flash-preview for general multimodal tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `Carefully transcribe the following ${mimeType.startsWith('video') ? 'video' : 'audio'} file. 
            Output the transcription as clear text. 
            ${timestampInstruction}
            If there are multiple speakers, label them clearly (e.g., Speaker A, Speaker B).
            Provide ONLY the transcription text without any conversational filler or meta-commentary.`,
          },
        ],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The AI returned an empty response. This can happen if the media content is not recognized or contains no speech.");
    }
    
    return text;
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    
    const errorStr = error.message || JSON.stringify(error);
    
    if (errorStr.includes('Invalid video data') || errorStr.includes('INVALID_ARGUMENT')) {
      throw new Error("The model rejected this media format or the file size was too large for a single request. Try using a standard MP3 or a smaller MP4 clip.");
    }
    
    throw new Error(error.message || "An error occurred while communicating with the Gemini API.");
  }
};

/**
 * Helper to convert a File object to a Base64 string.
 * Uses a chunked approach to handle large files (up to 500MB) without hitting 
 * browser string length limits or causing massive memory spikes.
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
        let binary = '';
        const len = bytes.byteLength;
        const chunk_size = 0x8000; // 32KB chunks to avoid stack limits
        
        for (let i = 0; i < len; i += chunk_size) {
          const chunk = bytes.subarray(i, i + chunk_size);
          // Converting subarray to string efficiently
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const base64 = btoa(binary);
        resolve(base64);
      } catch (e) {
        reject(new Error("Failed to convert file to Base64. The file may be too large for browser memory limits."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error occurred while reading the file. The file might be locked or inaccessible."));
    };

    // Use readAsArrayBuffer for better control over large data
    reader.readAsArrayBuffer(file);
  });
};