export interface TranscriptionResult {
  text: string;
  timestamp: Date;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
}
