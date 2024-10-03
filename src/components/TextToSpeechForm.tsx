'use client'

import { useState, FormEvent, useEffect, useCallback } from 'react'
import ApiKeyInput from './ApiKeyInput'
import GeneratedAudios from './GeneratedAudios';

interface Voice {
  voice_id: string;
  name: string;
}

interface Model {
  model_id: string;
  name: string;
  description: string;
  can_use_style: boolean;
  can_use_speaker_boost: boolean;
  languages: { language_id: string; name: string }[];
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface GeneratedAudio {
  variable: string;
  audioSrc: string;
}

export default function TextToSpeechForm() {
  const [apiKey, setApiKey] = useState<string>('')
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null)
  const [formData, setFormData] = useState<{
    text: string;
    model_id: string;
    voice_id: string;
    voice_settings: VoiceSettings;
    voice_latency: number;
    output_format: string;
    language_code: string;
    seed?: number;
    previous_text?: string;
    next_text?: string;
    previous_request_ids: string[];
    next_request_ids: string[];
    variable_list: string;
  }>({
    text: '',
    model_id: '',
    voice_id: '',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
    voice_latency: 1,
    output_format: 'mp3_44100_128',
    language_code: '',
    previous_request_ids: [],
    next_request_ids: [],
    variable_list: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [isLoadingVoiceSettings, setIsLoadingVoiceSettings] = useState(false)

  const fetchInitialData = useCallback(async (apiKey: string) => {
    await Promise.all([
      fetchVoices(apiKey),
      fetchModels(apiKey)
    ]);
  }, []);

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    if (apiKey) {
      fetchInitialData(apiKey);
    }
  }, [apiKey, fetchInitialData]);

  const checkApiKey = async () => {
    try {
      const response = await fetch('/api/check-api-key');
      const data = await response.json();
      setIsApiKeyValid(data.isSet);
      if (data.isSet && data.apiKey) {
        setApiKey(data.apiKey);
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setIsApiKeyValid(false);
    }
  };

  const fetchVoices = async (apiKey: string) => {
    setIsLoadingVoices(true);
    try {
      const response = await fetch('/api/get-voices', {
        headers: { 'x-api-key': apiKey },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      const data = await response.json();
      setVoices(data.voices || []);
    } catch (error) {
      console.error('Error fetching voices:', error);
      setError('Failed to load voices. Please try again later.');
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const fetchModels = async (apiKey: string) => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('/api/get-models', {
        headers: { 'x-api-key': apiKey },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setModels(data || []);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to load models. Please try again later.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (name.startsWith('voice_settings.')) {
      const settingName = name.split('.')[1] as keyof VoiceSettings
      setFormData(prev => ({
        ...prev,
        voice_settings: {
          ...prev.voice_settings,
          [settingName]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : Number(value),
        }
      }))
    } else if (name === 'model_id') {
      const selectedModel = models.find(model => model.model_id === value);
      setFormData(prev => {
        const newVoiceSettings: VoiceSettings = {
          ...prev.voice_settings,
        }
        if (selectedModel?.can_use_style) {
          newVoiceSettings.style = prev.voice_settings.style ?? 0
        } else {
          delete newVoiceSettings.style
        }
        if (selectedModel?.can_use_speaker_boost) {
          newVoiceSettings.use_speaker_boost = prev.voice_settings.use_speaker_boost ?? false
        } else {
          delete newVoiceSettings.use_speaker_boost
        }
        return {
          ...prev,
          [name]: value,
          language_code: selectedModel?.model_id === 'eleven_turbo_v2_5' ? prev.language_code : '',
          voice_settings: newVoiceSettings,
        }
      })
    } else if (name === 'seed') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? undefined : Number(value),
      }))
    } else if (name === 'previous_request_ids' || name === 'next_request_ids') {
      setFormData(prev => ({
        ...prev,
        [name]: value.split(',').map(id => id.trim()).filter(id => id !== ''),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
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
      const response = await fetch(`/api/get-voice-settings?voiceId=${voiceId}`, {
        headers: { 'x-api-key': apiKey },
      });
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
      setFormData(prev => {
        const newVoiceSettings: VoiceSettings = {
          stability: Number(settings.stability),
          similarity_boost: Number(settings.similarity_boost),
        }
        if (settings.style !== undefined) {
          newVoiceSettings.style = Number(settings.style)
        }
        if (settings.use_speaker_boost !== undefined) {
          newVoiceSettings.use_speaker_boost = settings.use_speaker_boost
        }
        return {
          ...prev,
          voice_settings: newVoiceSettings,
        }
      });
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
    setGeneratedAudios([])

    try {
      const variables = formData.variable_list.split(',').map(v => v.trim()).filter(v => v !== '')
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          ...formData,
          variables,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const data = await response.json()
      const newGeneratedAudios = data.audios.map((audio: string, index: number) => ({
        variable: variables[index],
        audioSrc: `data:audio/mpeg;base64,${audio}`
      }));
      setGeneratedAudios(newGeneratedAudios)
    } catch (err) {
      setError('An error occurred while generating speech. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApiKeySubmit = (submittedApiKey: string) => {
    setApiKey(submittedApiKey);
    setIsApiKeyValid(true);
  };

  const handleRegenerateAudio = async (index: number) => {
    setError(null);

    try {
      const variable = generatedAudios[index].variable;
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          ...formData,
          variables: [variable],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate speech');
      }

      const data = await response.json();
      const newAudioSrc = `data:audio/mpeg;base64,${data.audios[0]}`;

      setGeneratedAudios(prevAudios => {
        const newAudios = [...prevAudios];
        newAudios[index] = { ...newAudios[index], audioSrc: newAudioSrc };
        return newAudios;
      });
    } catch (err) {
      setError('An error occurred while regenerating speech. Please try again.');
      console.error(err);
    }
  };

  const selectedModel = models.find(model => model.model_id === formData.model_id);
  const isTurboV25 = selectedModel?.model_id === 'eleven_turbo_v2_5';

  if (isApiKeyValid === null) {
    return <div>Checking API key...</div>;
  }

  if (isApiKeyValid === false) {
    return <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />;
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
          placeholder="Enter the text to convert to speech. Use {} to indicate where the variable should be inserted."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="variable_list" className="block text-sm font-medium text-gray-700 mb-2">Variable List (comma-separated)</label>
        <input
          type="text"
          id="variable_list"
          name="variable_list"
          value={formData.variable_list}
          onChange={handleInputChange}
          placeholder="Enter comma-separated values"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          disabled={isLoadingModels}
        >
          <option value="">Select a model</option>
          {models.map((model) => (
            <option key={model.model_id} value={model.model_id}>
              {model.name}
            </option>
          ))}
        </select>
        {isLoadingModels && <p className="mt-1 text-sm text-gray-500">Loading models...</p>}
      </div>

      {selectedModel && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">{selectedModel.description}</p>
        </div>
      )}

      {isTurboV25 && (
        <div className="mb-4">
          <label htmlFor="language_code" className="block text-sm font-medium text-gray-700 mb-2">Language Code</label>
          <select
            id="language_code"
            name="language_code"
            value={formData.language_code}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a language</option>
            {selectedModel.languages.map((lang) => (
              <option key={lang.language_id} value={lang.language_id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      )}

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

      {selectedModel?.can_use_style && formData.voice_settings.style !== undefined && (
        <div className="mb-4">
          <label htmlFor="voice_settings.style" className="block text-sm font-medium text-gray-700 mb-2">
            Style: {formData.voice_settings.style.toFixed(2)}
          </label>
          <input
            type="range"
            id="voice_settings.style"
            name="voice_settings.style"
            min="0"
            max="1"
            step="0.01"
            value={formData.voice_settings.style}
            onChange={handleInputChange}
            className="w-full"
          />
        </div>
      )}

      {selectedModel?.can_use_speaker_boost && formData.voice_settings.use_speaker_boost !== undefined && (
        <div className="mb-4">
          <label htmlFor="voice_settings.use_speaker_boost" className="flex items-center text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              id="voice_settings.use_speaker_boost"
              name="voice_settings.use_speaker_boost"
              checked={formData.voice_settings.use_speaker_boost}
              onChange={handleInputChange}
              className="mr-2"
            />
            Use Speaker Boost
          </label>
        </div>
      )}

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

      <div className="mb-4">
        <label htmlFor="seed" className="block text-sm font-medium text-gray-700 mb-2">Seed</label>
        <input
          type="number"
          id="seed"
          name="seed"
          value={formData.seed ?? ''}
          onChange={handleInputChange}
          placeholder="Enter a seed value (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="previous_text" className="block text-sm font-medium text-gray-700 mb-2">Previous Text</label>
        <textarea
          id="previous_text"
          name="previous_text"
          value={formData.previous_text ?? ''}
          onChange={handleInputChange}
          placeholder="Enter previous text (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="next_text" className="block text-sm font-medium text-gray-700 mb-2">Next Text</label>
        <textarea
          id="next_text"
          name="next_text"
          value={formData.next_text ?? ''}
          onChange={handleInputChange}
          placeholder="Enter next text (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="previous_request_ids" className="block text-sm font-medium text-gray-700 mb-2">Previous Request IDs</label>
        <input
          type="text"
          id="previous_request_ids"
          name="previous_request_ids"
          value={formData.previous_request_ids.join(', ')}
          onChange={handleInputChange}
          placeholder="Enter previous request IDs, separated by commas"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="next_request_ids" className="block text-sm font-medium text-gray-700 mb-2">Next Request IDs</label>
        <input
          type="text"
          id="next_request_ids"
          name="next_request_ids"
          value={formData.next_request_ids.join(', ')}
          onChange={handleInputChange}
          placeholder="Enter next request IDs, separated by commas"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        disabled={isLoading || isLoadingVoices || isLoadingModels || isLoadingVoiceSettings}
      >
        {isLoading ? 'Generating...' : 'Generate Speech'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <GeneratedAudios
        generatedAudios={generatedAudios}
        onRegenerateAudio={handleRegenerateAudio}
      />
    </form>
  )
}