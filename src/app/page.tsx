'use client';

import HistoryPage from '@/components/HistoryPage';
import TextToSpeechForm from '@/components/TextToSpeechForm';
import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'tts' | 'history'>('tts');

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="p-2 mx-auto">
        <div className="mb-8 border-b border-gray-300">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('tts')}
              className={`${
                activeTab === 'tts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Text-to-Speech
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              History
            </button>
          </nav>
        </div>

        {activeTab === 'tts' && <TextToSpeechForm />}
        {activeTab === 'history' && <HistoryPage />}
      </div>
    </main>
  );
}