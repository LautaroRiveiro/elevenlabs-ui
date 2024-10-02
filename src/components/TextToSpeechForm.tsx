'use client'

import { useState, FormEvent, useEffect } from 'react'

interface Voice {
  voice_id: string;
  name: string;
}

interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
}

export default function TextToSpeechForm() {
  const [formData, setFormData] = useState({
    text: '',
    modelId: '',
    voiceId: '',
    stability: 0.5,
    similarityBoost: 0.5,
    optimizeStreamingLatency: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [isLoadingVoiceSettings, setIsLoadingVoiceSettings] = useState(false)

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('/api/get-voices');
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }
        const data = await response.json();
        setVoices(data.voices);
      } catch (error) {
        console.error('Error fetching voices:', error);
        setError('Failed to load voices. Please try again later.');
      } finally {
        setIsLoadingVoices(false);
      }
    };

    fetchVoices();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))

    if (name === 'voiceId' && value) {
      fetchVoiceSettings(value);
    }
  }

  const fetchVoiceSettings = async (voiceId: string) => {
    setIsLoadingVoiceSettings(true);
    setError(null);  // Clear any previous errors
    try {
      const response = await fetch(`/api/get-voice-settings?voiceId=${voiceId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!data.similarity_boost && !data.stability) {
        throw new Error('Voice settings not found in the response');
      }
      updateVoiceSettings(data);
    } catch (error) {
      console.error('Error fetching voice settings:', error);
      setError('Failed to load voice settings. Using default values.');
      updateVoiceSettings(null);  // This will set default values
    } finally {
      setIsLoadingVoiceSettings(false);
    }
  }

  const updateVoiceSettings = (settings: VoiceSettings | null) => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        stability: settings.stability ?? prev.stability,
        similarityBoost: settings.similarity_boost ?? prev.similarityBoost,
      }));
    } else {
      console.error('Received null or undefined voice settings');
      setError('Failed to load voice settings. Using default values.');
      // Set default values
      setFormData(prev => ({
        ...prev,
        stability: 0.5,  // Default value
        similarityBoost: 0.5,  // Default value
      }));
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value),
    }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setAudioSrc(null)

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      const data = await response.json()
      const audio = `data:audio/mpeg;base64,${data.audio}`
      setAudioSrc(audio)
    } catch (err) {
      setError('An error occurred while generating speech. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">ElevenLabs Text-to-Speech</h2>

      <div className="mb-4">
        <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">Text</label>
        <textarea
          id="text"
          name="text"
          value={formData.text}
          onChange={handleInputChange}
          placeholder="Enter the text to convert to speech"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="modelId" className="block text-sm font-medium text-gray-700 mb-2">Model ID</label>
        <select
          id="modelId"
          name="modelId"
          value={formData.modelId}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select a model</option>
          <option value="eleven_monolingual_v1">Eleven Monolingual v1</option>
          <option value="eleven_multilingual_v1">Eleven Multilingual v1</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="voiceId" className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
        <select
          id="voiceId"
          name="voiceId"
          value={formData.voiceId}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={isLoadingVoices || isLoadingVoiceSettings}
        >
          <option value="">Select a voice</option>
          {voices.map((voice) => (
            <option key={voice.voice_id} value={voice.voice_id}>
              {voice.name}
            </option>
          ))}
        </select>
        {isLoadingVoices && <p className="mt-1 text-sm text-gray-500">Loading voices...</p>}
        {isLoadingVoiceSettings && <p className="mt-1 text-sm text-gray-500">Loading voice settings...</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="stability" className="block text-sm font-medium text-gray-700 mb-2">
          Stability: {formData.stability.toFixed(2)}
        </label>
        <input
          type="range"
          id="stability"
          name="stability"
          min="0"
          max="1"
          step="0.01"
          value={formData.stability}
          onChange={handleSliderChange}
          className="w-full"
          disabled={isLoadingVoiceSettings}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="similarityBoost" className="block text-sm font-medium text-gray-700 mb-2">
          Similarity Boost: {formData.similarityBoost.toFixed(2)}
        </label>
        <input
          type="range"
          id="similarityBoost"
          name="similarityBoost"
          min="0"
          max="1"
          step="0.01"
          value={formData.similarityBoost}
          onChange={handleSliderChange}
          className="w-full"
          disabled={isLoadingVoiceSettings}
        />
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="optimizeStreamingLatency"
            checked={formData.optimizeStreamingLatency}
            onChange={handleInputChange}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Optimize Streaming Latency</span>
        </label>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        disabled={isLoading || isLoadingVoices || isLoadingVoiceSettings}
      >
        {isLoading ? 'Generating...' : 'Generate Speech'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {audioSrc && (
        <div className="mt-4">
          <audio controls src={audioSrc} className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </form>
  )
}