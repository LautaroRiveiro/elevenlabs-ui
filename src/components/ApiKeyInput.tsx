'use client'

import { useState, FormEvent, useEffect } from 'react'

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
}

export default function ApiKeyInput({ onApiKeySubmit }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState<string>('')
  const [saveApiKey, setSaveApiKey] = useState<boolean>(false)
  const [savedApiKeys, setSavedApiKeys] = useState<string[]>([])

  useEffect(() => {
    const keys = localStorage.getItem('elevenlabsApiKeys')
    if (keys) {
      setSavedApiKeys(JSON.parse(keys))
    }
  }, [])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saveApiKey && !savedApiKeys.includes(apiKey)) {
      const newSavedKeys = [...savedApiKeys, apiKey]
      setSavedApiKeys(newSavedKeys)
      localStorage.setItem('elevenlabsApiKeys', JSON.stringify(newSavedKeys))
    }
    onApiKeySubmit(apiKey);
  };

  const handleSelectApiKey = (key: string) => {
    setApiKey(key)
  }

  const handleDeleteApiKey = (key: string) => {
    const newSavedKeys = savedApiKeys.filter(k => k !== key)
    setSavedApiKeys(newSavedKeys)
    localStorage.setItem('elevenlabsApiKeys', JSON.stringify(newSavedKeys))
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Enter ElevenLabs API Key</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <input
            type="text"
            id="apiKey"
            name="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your ElevenLabs API Key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="saveApiKey"
            name="saveApiKey"
            checked={saveApiKey}
            onChange={(e) => setSaveApiKey(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="saveApiKey" className="text-sm text-gray-700">Save API Key</label>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Submit
        </button>
      </form>
      {savedApiKeys.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Saved API Keys</h3>
          <ul className="space-y-2">
            {savedApiKeys.map((key, index) => (
              <li key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{key.slice(0, 8)}...</span>
                <div>
                  <button
                    onClick={() => handleSelectApiKey(key)}
                    className="text-sm bg-gray-200 text-gray-700 py-1 px-2 rounded mr-2 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => handleDeleteApiKey(key)}
                    className="text-sm bg-red-100 text-red-600 p-1 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}