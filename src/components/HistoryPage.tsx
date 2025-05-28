'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ApiKeyInput from './ApiKeyInput';

interface Voice {
  voice_id: string;
  name: string;
}

interface HistoryItem {
  history_item_id: string;
  request_id: string;
  voice_id: string;
  voice_name: string;
  text: string;
  date_unix: number;
  character_count_change_from: number;
  character_count_change_to: number;
  content_type: string;
  state: 'created' | 'deleted' | 'processing' | 'processed' | 'error' | 'awaiting_processing';
  settings: {
    similarity_boost?: number;
    stability?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  model_id?: string;
  feedback: any;
  share_link_id: string | null;
  source: string;
}

interface HistoryResponse {
  history: HistoryItem[];
  last_history_item_id: string | null;
  has_more: boolean;
}

export default function HistoryPage() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastHistoryItemId, setLastHistoryItemId] = useState<string | null>(null);  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(false);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const checkApiKey = useCallback(async () => {
    try {
      const response = await fetch('/api/check-api-key');
      const data = await response.json();
      setIsApiKeyValid(data.isSet);
      if (data.isSet && data.apiKey) {
        setApiKey(data.apiKey);
      }
    } catch (err) {
      console.error('Error checking API key:', err);
      setIsApiKeyValid(false);
      setError('Failed to check API key status.');
    }
  }, []);

  const fetchVoices = useCallback(async (currentApiKey: string) => {
    if (!currentApiKey) return;
    setIsLoadingVoices(true);
    setError(null);
    try {
      const response = await fetch('/api/get-voices', {
        headers: { 'x-api-key': currentApiKey },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      const data = await response.json();
      setVoices(data.voices || []);
      setFilteredVoices(data.voices || []);
    } catch (err) {
      console.error('Error fetching voices:', err);
      setError('Failed to load voices. Please ensure your API key is correct and try again.');
    } finally {
      setIsLoadingVoices(false);
    }
  }, []);

  // Filter voices based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVoices(voices);
    } else {
      const filtered = voices.filter(voice =>
        voice.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVoices(filtered);
    }
  }, [searchTerm, voices]);

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  useEffect(() => {
    if (apiKey && isApiKeyValid) {
      fetchVoices(apiKey);
    }
  }, [apiKey, isApiKeyValid, fetchVoices]);

  const fetchHistory = useCallback(async (voiceIdToFetch: string, startAfterId?: string) => {
    if (!apiKey || !voiceIdToFetch) return;
    setIsLoadingHistory(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        voice_id: voiceIdToFetch,
        page_size: '100',
      });
      if (startAfterId) {
        params.append('start_after_history_item_id', startAfterId);
      }

      const response = await fetch(`/api/get-history?${params.toString()}`, {
        headers: { 'x-api-key': apiKey },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch history');
      }
      const data: HistoryResponse = await response.json();
      
      const filteredHistory = data.history.filter(item => item.voice_id === voiceIdToFetch);

      setHistoryItems(prev => startAfterId ? [...prev, ...filteredHistory] : filteredHistory);
      setLastHistoryItemId(data.last_history_item_id);
      setHasMoreHistory(data.has_more && (filteredHistory.length > 0 || data.history.length === 0));

    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError(err.message || 'Failed to load history. Please try again.');
      setHistoryItems([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (selectedVoiceId) {
      setHistoryItems([]);
      setLastHistoryItemId(null);
      setHasMoreHistory(false);
      fetchHistory(selectedVoiceId);
    } else {
      setHistoryItems([]);
      setLastHistoryItemId(null);
      setHasMoreHistory(false);
    }
  }, [selectedVoiceId, fetchHistory]);
  const toggleAudio = async (historyItemId: string) => {
    if (!apiKey) return;
    
    // Si se está reproduciendo el mismo audio, pausar o reanudar
    if (playingItemId === historyItemId && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.error('Error resuming audio:', err);
          setError('Failed to resume audio');
        }
      }
      return;
    }
    
    // Si hay otro audio reproduciéndose, pararlo primero
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setPlayingItemId(historyItemId);
    setIsPlaying(false);
    
    try {
      const response = await fetch(`/api/get-audio/${historyItemId}`, {
        headers: { 'x-api-key': apiKey },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingItemId(null);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setPlayingItemId(null);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        setError('Failed to play audio');
        audioRef.current = null;
      };

      audio.onplay = () => {
        setIsPlaying(true);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      await audio.play();
    } catch (err: any) {
      console.error('Error playing audio:', err);
      setError(err.message || 'Failed to play audio');
      setPlayingItemId(null);
      setIsPlaying(false);
      audioRef.current = null;
    }
  };

  const handleApiKeySubmit = (submittedApiKey: string) => {
    setApiKey(submittedApiKey);
    setIsApiKeyValid(true);
    setError(null);
  };

  const handleLoadMore = () => {
    if (selectedVoiceId && lastHistoryItemId) {
      fetchHistory(selectedVoiceId, lastHistoryItemId);
    }
  };

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoiceId(voice.voice_id);
    setSelectedVoiceName(voice.name);
    setSearchTerm(voice.name);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
    
    // Clear selection if input doesn't match selected voice
    if (value !== selectedVoiceName) {
      setSelectedVoiceId('');
      setSelectedVoiceName('');
    }
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const clearSelection = () => {
    setSelectedVoiceId('');
    setSelectedVoiceName('');
    setSearchTerm('');
    setShowDropdown(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const copySettings = async (item: HistoryItem) => {
    try {
      const settingsData = {
        model_id: item.model_id || null,
        settings: {
          stability: item.settings?.stability || null,
          similarity_boost: item.settings?.similarity_boost || null,
          style: item.settings?.style || null,
          use_speaker_boost: item.settings?.use_speaker_boost || null,
        }
      };

      await navigator.clipboard.writeText(JSON.stringify(settingsData, null, 2));
      
      // Show feedback for 2 seconds
      setCopiedItemId(item.history_item_id);
      setTimeout(() => {
        setCopiedItemId(null);
      }, 2000);    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy settings to clipboard');
    }
  };

  const downloadAudio = async (historyItemId: string, voiceName: string, text: string) => {
    try {
      const response = await fetch(`/api/get-audio/${historyItemId}`, {
        headers: { 'x-api-key': apiKey },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `${voiceName}_${text.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${historyItemId}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      URL.revokeObjectURL(audioUrl);
    } catch (err: any) {
      console.error('Error downloading audio:', err);
      setError(err.message || 'Failed to download audio');
    }
  };

  if (isApiKeyValid === null) {
    return <div className="text-center p-8">Checking API key...</div>;
  }

  if (isApiKeyValid === false) {
    return <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />;
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <label htmlFor="voice-search" className="block text-sm font-medium text-gray-700 mb-1">
          Select Voice:
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="voice-search"
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={isLoadingVoices ? 'Loading voices...' : 'Search voices...'}
            disabled={isLoadingVoices || voices.length === 0}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
          />
          {selectedVoiceId && (
            <button
              onClick={clearSelection}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              type="button"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {showDropdown && filteredVoices.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          >
            {filteredVoices.map((voice) => (
              <div
                key={voice.voice_id}
                onClick={() => handleVoiceSelect(voice)}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-600 hover:text-white ${
                  selectedVoiceId === voice.voice_id ? 'bg-blue-600 text-white' : 'text-gray-900'
                }`}
              >
                <span className="block truncate">{voice.name}</span>
                {selectedVoiceId === voice.voice_id && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        
        {showDropdown && searchTerm && filteredVoices.length === 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            <div className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-700">
              No voices found matching "{searchTerm}"
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isLoadingHistory && historyItems.length === 0 && <p>Loading history...</p>}
      
      {!isLoadingHistory && historyItems.length === 0 && selectedVoiceId && <p>No history found for this voice or period.</p>}

      {historyItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Text</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stability</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Similarity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Style</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speaker Boost</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">History ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">              {historyItems.map((item) => (
                <tr key={item.history_item_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.date_unix * 1000).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={item.text}>{item.text}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="max-w-xs truncate" title={item.model_id || 'N/A'}>
                      {item.model_id || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.settings?.stability?.toFixed(2) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.settings?.similarity_boost?.toFixed(2) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.settings?.style?.toFixed(2) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.settings?.use_speaker_boost !== undefined ? 
                      (item.settings.use_speaker_boost ? 'Yes' : 'No') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.history_item_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">                    <button
                      onClick={() => toggleAudio(item.history_item_id)}                      className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title={playingItemId === item.history_item_id && isPlaying ? "Pause audio" : "Play audio"}
                    >                      {playingItemId === item.history_item_id && isPlaying ? (
                        // Pause icon
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        // Play icon
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => downloadAudio(item.history_item_id, item.voice_name, item.text)}
                      className="ml-2 inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      title="Download audio"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>                    <button
                      onClick={() => copySettings(item)}
                      className={`ml-2 inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        copiedItemId === item.history_item_id 
                          ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500' 
                          : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      }`}
                      title={copiedItemId === item.history_item_id ? "Copied!" : "Copy settings to clipboard"}
                    >
                      {copiedItemId === item.history_item_id ? (
                        // Checkmark icon when copied
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        // Copy icon
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMoreHistory && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingHistory}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoadingHistory ? 'Loading more...' : 'Load More'}
          </button>
        </div>
      )}
       {!selectedVoiceId && !isLoadingVoices && voices.length > 0 && (
         <p className="text-center text-gray-500 mt-4">Please select a voice to view its history.</p>
       )}
    </div>
  );
}