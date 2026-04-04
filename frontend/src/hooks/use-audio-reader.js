import { useState, useEffect, useRef } from 'react'

// Web Speech API TTS — zero API cost, browser-native.
// Splits text into sentences and tracks progress for scroll sync.
export function useAudioReader(text) {
  const [isPlaying, setIsPlaying]   = useState(false)
  const [isPaused,  setIsPaused]    = useState(false)
  const [progress,  setProgress]    = useState(0)   // 0–1
  const [supported, setSupported]   = useState(false)
  const utteranceRef = useRef(null)

  useEffect(() => {
    setSupported('speechSynthesis' in window)
    return () => window.speechSynthesis?.cancel()
  }, [])

  function play() {
    if (!supported || !text) return

    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate  = 0.95
    utterance.pitch = 1

    const words = text.split(/\s+/).length

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const wordIndex = text.slice(0, e.charIndex).split(/\s+/).length
        setProgress(wordIndex / words)
      }
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(1)
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsPlaying(true)
    setIsPaused(false)
  }

  function pause() {
    window.speechSynthesis.pause()
    setIsPlaying(false)
    setIsPaused(true)
  }

  function stop() {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
  }

  return { play, pause, stop, isPlaying, isPaused, progress, supported }
}
