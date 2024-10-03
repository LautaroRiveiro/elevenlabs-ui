import { useState } from 'react'
import JSZip from 'jszip'

interface GeneratedAudio {
  variable: string
  audioSrc: string
}

interface GeneratedAudiosProps {
  generatedAudios: GeneratedAudio[]
  onRegenerateAudio: (index: number) => Promise<void>
}

export default function GeneratedAudios({ generatedAudios, onRegenerateAudio }: GeneratedAudiosProps) {
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRegenerateAudio = async (index: number) => {
    setRegeneratingIndex(index)
    setError(null)
    try {
      await onRegenerateAudio(index)
    } catch (err) {
      setError('An error occurred while regenerating speech. Please try again.')
      console.error(err)
    } finally {
      setRegeneratingIndex(null)
    }
  }

  const handleDownloadZip = async () => {
    if (generatedAudios.length === 0) {
      setError('No audios generated yet. Please generate audios first.')
      return
    }

    try {
      const zip = new JSZip()

      // Add each audio to the zip file
      generatedAudios.forEach((audio) => {
        const base64Data = audio.audioSrc.split(',')[1]
        zip.file(`${audio.variable}.mp3`, base64Data, { base64: true })
      })

      // Generate the zip file
      const content = await zip.generateAsync({ type: "blob" })

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(content)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'generated_audios.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('An error occurred while generating the ZIP file. Please try again.')
      console.error(err)
    }
  }

  if (generatedAudios.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Generated Audios:</h3>
      {generatedAudios.map((audio, index) => (
        <div key={index} className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Variable: {audio.variable}</p>
          <audio controls src={audio.audioSrc} className="w-full mb-2">
            Your browser does not support the audio element.
          </audio>
          <button
            onClick={() => handleRegenerateAudio(index)}
            className={`ml-2 px-3 py-1 text-sm font-medium rounded-md ${
              regeneratingIndex === index
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
            disabled={regeneratingIndex === index}
          >
            {regeneratingIndex === index ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      ))}
      <button
        onClick={handleDownloadZip}
        type='button'
        className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        Download All as ZIP
      </button>
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  )
}