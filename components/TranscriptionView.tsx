import React from 'react';
import { Copy, Check, FileText, Download } from 'lucide-react';

interface TranscriptionViewProps {
  text: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `transcription-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <FileText className="w-5 h-5 text-indigo-600" />
          Transcription Result
        </div>
        <div className="flex items-center gap-2">
           <button
            onClick={handleDownload}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
            title="Download as .txt"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              copied 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Text
              </>
            )}
          </button>
        </div>
      </div>
      <div className="p-6 max-h-[600px] overflow-y-auto">
        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-mono text-sm sm:text-base">
          {text}
        </div>
      </div>
    </div>
  );
};
