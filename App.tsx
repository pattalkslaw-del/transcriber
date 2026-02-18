import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { TranscriptionView } from './components/TranscriptionView';
import { fileToBase64, transcribeMedia } from './services/geminiService';
import { AppStatus, FileData } from './types';
import { Loader2, Music, Video, Trash2, Play, Pause, RefreshCw, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isPreparing, setIsPreparing] = useState(false);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [mediaElement, setMediaElement] = useState<HTMLAudioElement | HTMLVideoElement | null>(null);

  const isVideoFile = fileData?.file.type === 'video/mp4';

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (fileData?.previewUrl) {
        URL.revokeObjectURL(fileData.previewUrl);
      }
    };
  }, [fileData]);

  // Media player handler
  useEffect(() => {
    if (fileData?.previewUrl) {
      const media = isVideoFile ? document.createElement('video') : new Audio();
      media.src = fileData.previewUrl;
      media.onended = () => setIsPlaying(false);
      media.onpause = () => setIsPlaying(false);
      media.onplay = () => setIsPlaying(true);
      setMediaElement(media);
      
      return () => {
        media.pause();
        media.src = '';
      };
    }
  }, [fileData, isVideoFile]);

  const togglePlay = () => {
    if (!mediaElement) return;
    if (isPlaying) {
      mediaElement.pause();
    } else {
      mediaElement.play();
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setStatus(AppStatus.IDLE);
      setIsPreparing(true);
      setErrorMsg(null);
      setTranscription(null);
      setFileData(null);
      
      const previewUrl = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      
      setFileData({
        file,
        previewUrl,
        base64
      });
    } catch (err: any) {
      console.error("File processing error", err);
      setErrorMsg(err.message || "Failed to process file. Please try another one.");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleTranscribe = async () => {
    if (!fileData || !fileData.base64) {
      setErrorMsg("File data is not ready. Please try re-selecting the file.");
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setErrorMsg(null);

    try {
      const result = await transcribeMedia(fileData.base64, fileData.file.type, includeTimestamps);
      setTranscription(result);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error("Transcription error", err);
      setStatus(AppStatus.ERROR);
      setErrorMsg(err.message || "An unexpected error occurred during transcription.");
    }
  };

  const resetApp = () => {
    setFileData(null);
    setTranscription(null);
    setStatus(AppStatus.IDLE);
    setIsPreparing(false);
    setErrorMsg(null);
    setMediaElement(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        
        {/* Intro Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Turn Media into Text with <span className="text-indigo-600">AI</span>
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Upload your meetings, lectures, voice notes, or MP4 videos. Gemini's multimodal capabilities will transcribe them instantly.
          </p>
        </div>

        {/* Error Display */}
        {((status === AppStatus.ERROR || errorMsg) && !isPreparing) && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm animate-in shake">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">
                  {errorMsg}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Interface */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* Uploader Section */}
          {!fileData && !isPreparing && (
             <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 p-6 sm:p-8">
                <FileUpload onFileSelect={handleFileSelect} />
             </div>
          )}

          {/* Preparation Loader */}
          {isPreparing && (
            <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 p-12 flex flex-col items-center justify-center space-y-4 animate-pulse">
               <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
               <p className="text-slate-600 font-medium">Preparing large file for AI processing...</p>
               <p className="text-xs text-slate-400">This may take a moment for 500MB files</p>
            </div>
          )}

          {/* Selected File & Action View */}
          {fileData && (
            <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="p-6 sm:p-8 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-indigo-100 p-3 rounded-xl">
                      {isVideoFile ? <Video className="w-8 h-8 text-indigo-600" /> : <Music className="w-8 h-8 text-indigo-600" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                        {fileData.file.name}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {(fileData.file.size / (1024 * 1024)).toFixed(2)} MB • {isVideoFile ? 'Video' : 'Audio'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={resetApp}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Media Player Controls */}
                <div className="mt-6 bg-slate-50 rounded-xl p-4 flex flex-col gap-4 border border-slate-100">
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={togglePlay}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-transform active:scale-95 shadow-md shadow-indigo-200"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full bg-indigo-500 w-full ${isPlaying ? 'animate-pulse' : 'opacity-30'}`}></div>
                      </div>
                      <span className="text-xs font-mono text-slate-500">Preview</span>
                   </div>
                   
                   {/* Visual Preview for Video */}
                   {isVideoFile && (
                     <div className="aspect-video w-full max-w-sm mx-auto bg-black rounded-lg overflow-hidden relative group">
                        <video 
                          src={fileData.previewUrl} 
                          className="w-full h-full object-contain"
                          onClick={togglePlay}
                        />
                        {!isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                            <Play className="w-12 h-12 text-white/80" />
                          </div>
                        )}
                     </div>
                   )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-slate-50/50 p-6 sm:px-8 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="timestamp-toggle" className="flex items-center cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        id="timestamp-toggle" 
                        className="sr-only" 
                        checked={includeTimestamps}
                        onChange={() => setIncludeTimestamps(!includeTimestamps)}
                        disabled={status === AppStatus.PROCESSING || status === AppStatus.SUCCESS}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${includeTimestamps ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${includeTimestamps ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                    <div className="ml-3 flex items-center gap-1.5 text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      <Clock className={`w-4 h-4 ${includeTimestamps ? 'text-indigo-600' : 'text-slate-400'}`} />
                      Include Timestamps
                    </div>
                  </label>
                </div>

                {status === AppStatus.PROCESSING ? (
                  <button disabled className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-medium cursor-not-allowed">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transcribing...
                  </button>
                ) : (
                  <button 
                    onClick={handleTranscribe}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={status === AppStatus.SUCCESS}
                  >
                    {status === AppStatus.SUCCESS ? (
                      <>
                        <CheckIcon className="w-5 h-5" />
                        Transcribed
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-5 h-5" />
                        Start Transcription
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          {transcription && (
            <div className="scroll-mt-24" id="results">
              <TranscriptionView text={transcription} />
              <div className="mt-8 flex justify-center">
                 <button 
                   onClick={resetApp} 
                   className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors px-4 py-2 hover:bg-white rounded-lg"
                  >
                   <RefreshCw className="w-4 h-4" />
                   Transcribe Another File
                 </button>
              </div>
            </div>
          )}
          
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Gemini Media Transcriber. Supports Audio and MP4 Video.</p>
        </div>
      </footer>
    </div>
  );
};

// Helper Icons for button states
const CheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
);

export default App;