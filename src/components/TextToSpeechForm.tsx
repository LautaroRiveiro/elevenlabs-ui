'use client'

import { useState, FormEvent, useEffect } from 'react'

interface Voice {
  voice_id: string;
  name: string;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

export default function TextToSpeechForm() {
  const [formData, setFormData] = useState({
    text: '',
    model_id: '',
    voice_id: '',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
    voice_latency: 1,
    output_format: 'mp3_44100_128',
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
    if (name.startsWith('voice_settings.')) {
      const settingName = name.split('.')[1] as keyof VoiceSettings
      setFormData(prev => ({
        ...prev,
        voice_settings: {
          ...prev.voice_settings,
          [settingName]: Number(value),
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value,
      }))
    }

    if (name === 'voice_id' && value) {
      fetchVoiceSettings(value);
    }
  }

  const fetchVoiceSettings = async (voiceId: string) => {
    setIsLoadingVoiceSettings(true);
    setError(null);
    try {
      const response = await fetch(`/api/get-voice-settings?voiceId=${voiceId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (typeof data.stability === 'undefined' || typeof data.similarity_boost === 'undefined') {
        throw new Error('Voice settings not found in the response');
      }
      updateVoiceSettings(data);
    } catch (error) {
      console.error('Error fetching voice settings:', error);
      setError('Failed to load voice settings. Using default values.');
      updateVoiceSettings(null);
    } finally {
      setIsLoadingVoiceSettings(false);
    }
  }

  const updateVoiceSettings = (settings: VoiceSettings | null) => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        voice_settings: {
          stability: Number(settings.stability),
          similarity_boost: Number(settings.similarity_boost),
        }
      }));
    } else {
      console.error('Received null or undefined voice settings');
      setError('Failed to load voice settings. Using default values.');
      setFormData(prev => ({
        ...prev,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        }
      }));
    }
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
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
        <label htmlFor="model_id" className="block text-sm font-medium text-gray-700 mb-2">Model ID</label>
        <select
          id="model_id"
          name="model_id"
          value={formData.model_id}
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
        <label htmlFor="voice_id" className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
        <select
          id="voice_id"
          name="voice_id"
          value={formData.voice_id}
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
        <label htmlFor="voice_settings.stability" className="block text-sm font-medium text-gray-700 mb-2">
          Stability: {formData.voice_settings.stability.toFixed(2)}
        </label>
        <input
          type="range"
          id="voice_settings.stability"
          name="voice_settings.stability"
          min="0"
          max="1"
          step="0.01"
          value={formData.voice_settings.stability}
          onChange={handleInputChange}
          className="w-full"
          disabled={isLoadingVoiceSettings}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="voice_settings.similarity_boost" className="block text-sm font-medium text-gray-700 mb-2">
          Similarity Boost: {formData.voice_settings.similarity_boost.toFixed(2)}
        </label>
        <input
          type="range"
          id="voice_settings.similarity_boost"
          name="voice_settings.similarity_boost"
          min="0"
          max="1"
          step="0.01"
          value={formData.voice_settings.similarity_boost}
          onChange={handleInputChange}
          className="w-full"
          disabled={isLoadingVoiceSettings}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="voice_latency" className="block text-sm font-medium text-gray-700 mb-2">Voice Latency</label>
        <select
          id="voice_latency"
          name="voice_latency"
          value={formData.voice_latency}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={1}>Low latency (1)</option>
          <option value={2}>Medium latency (2)</option>
          <option value={3}>High latency (3)</option>
          <option value={4}>Very high latency (4)</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="output_format" className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
        <select
          id="output_format"
          name="output_format"
          value={formData.output_format}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="mp3_44100_128">MP3 44.1kHz 128kbps</option>
          <option value="mp3_44100_64">MP3 44.1kHz 64kbps</option>
          <option value="pcm_16000">PCM 16000Hz</option>
          <option value="pcm_22050">PCM 22050Hz</option>
          <option value="pcm_24000">PCM 24000Hz</option>
          <option value="pcm_44100">PCM 44100Hz</option>
        </select>
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