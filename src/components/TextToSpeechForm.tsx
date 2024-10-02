'use client'

import { useState, FormEvent } from 'react'

export default function TextToSpeechForm() {
  const [formData, setFormData] = useState({
    text: '',
    modelId: '',
    voiceId: '',
    stability: 0,
    similarityBoost: 0,
    optimizeStreamingLatency: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
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
    console.log('Form data:', formData)
    // Aquí iría la lógica para enviar los datos a la API de ElevenLabs
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
        >
          <option value="">Select a model</option>
          <option value="eleven_monolingual_v1">Eleven Monolingual v1</option>
          <option value="eleven_multilingual_v1">Eleven Multilingual v1</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="voiceId" className="block text-sm font-medium text-gray-700 mb-2">Voice ID</label>
        <input
          type="text"
          id="voiceId"
          name="voiceId"
          value={formData.voiceId}
          onChange={handleInputChange}
          placeholder="Enter the voice ID"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="stability" className="block text-sm font-medium text-gray-700 mb-2">
          Stability: {formData.stability}
        </label>
        <input
          type="range"
          id="stability"
          name="stability"
          min="0"
          max="1"
          step="0.1"
          value={formData.stability}
          onChange={handleSliderChange}
          className="w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="similarityBoost" className="block text-sm font-medium text-gray-700 mb-2">
          Similarity Boost: {formData.similarityBoost}
        </label>
        <input
          type="range"
          id="similarityBoost"
          name="similarityBoost"
          min="0"
          max="1"
          step="0.1"
          value={formData.similarityBoost}
          onChange={handleSliderChange}
          className="w-full"
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
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Generate Speech
      </button>
    </form>
  )
}