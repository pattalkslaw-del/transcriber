import React, { useCallback, useState } from 'react';
import { UploadCloud, FileAudio, FileVideo, X, AlertCircle, Info } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndSelectFile = (file: File) => {
    setError(null);
    
    const isAudio = file.type.startsWith('audio/');
    const isMp4 = file.type === 'video/mp4';

    // Check if it's an audio or mp4 file
    if (!isAudio && !isMp4) {
      setError('Please upload a valid audio file or MP4 video.');
      return;
    }

    // Increased size limit: 500MB
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('File is too large. Please upload a file smaller than 500MB.');
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  }, [disabled, onFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative group cursor-pointer transition-all duration-300 ease-in-out border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-white'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept="audio/*,video/mp4"
          onChange={handleInputChange}
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full transition-colors duration-300 ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
            {isDragging ? (
              <FileVideo className="w-10 h-10 animate-bounce" />
            ) : (
              <div className="flex -space-x-2">
                <FileAudio className="w-10 h-10" />
                <FileVideo className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-50 rounded-full" />
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {isDragging ? 'Drop media file here' : 'Click to upload or drag & drop'}
            </h3>
            <p className="text-sm text-slate-500">
              Supports MP3, WAV, MP4 (Max 500MB)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <p>
          <strong>Large File Support:</strong> You can now upload files up to 500MB. Processing larger files may take a minute or two depending on length and complexity.
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto hover:bg-red-100 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};