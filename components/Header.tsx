import React from 'react';
import { PlayCircle, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <PlayCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Gemini Media Transcriber
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium border border-indigo-200">Pro</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Powered by Gemini 3 Flash</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <a href="https://ai.google.dev" target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            <span>Built with Gemini API</span>
          </a>
        </div>
      </div>
    </header>
  );
};