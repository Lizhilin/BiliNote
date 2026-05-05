import { useState, useCallback, useRef, useEffect } from 'react'

export type SpeechState = 'idle' | 'playing' | 'paused'

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^---+\s*$/gm, '')
    .replace(/\|/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function useSpeech() {
  const [state, setState] = useState<SpeechState>('idle')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // 收集所有中文相关语音
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const handler = () => {
      try {
        const all = window.speechSynthesis.getVoices()
        const zh = all.filter(v => v.lang.startsWith('zh'))
        setVoices(zh)

        // 只在首次加载时设置默认语音
        setSelectedVoiceName(prev => {
          if (prev) return prev // 已有选择，不动
          const defaultVoice =
            zh.find(v => v.name.startsWith('Microsoft Yaoyao'))  // 用户指定离线默认
            || zh.find(v => v.name.startsWith('Microsoft Xiaoxiao Online (Natural)'))
            || zh.find(v => v.name.startsWith('Microsoft Xiaoxiao'))
            || zh[0]
          return defaultVoice?.name || ''
        })
      } catch {
        // 不支持语音合成的浏览器静默降级
      }
    }
    handler()
    try {
      window.speechSynthesis.addEventListener('voiceschanged', handler)
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler)
        window.speechSynthesis.cancel()
      }
    } catch {
      return () => {}
    }
  }, [])

  const currentVoice = voices.find(v => v.name === selectedVoiceName) || null

  const speak = useCallback((text: string) => {
    try {
      window.speechSynthesis.cancel()
    } catch {
      return
    }

    const plain = stripMarkdown(text)
    if (!plain) return

    const utterance = new SpeechSynthesisUtterance(plain)
    utterance.lang = 'zh-CN'
    utterance.rate = 1.0
    utterance.pitch = 1.0

    const voice = voices.find(v => v.name === selectedVoiceName) || currentVoice
    if (voice) utterance.voice = voice

    utterance.onstart = () => setState('playing')
    utterance.onend = () => setState('idle')
    utterance.onpause = () => setState('paused')
    utterance.onresume = () => setState('playing')
    utterance.onerror = () => setState('idle')

    utteranceRef.current = utterance
    try {
      window.speechSynthesis.speak(utterance)
    } catch {
      setState('idle')
    }
  }, [voices, selectedVoiceName, currentVoice])

  const pause = useCallback(() => {
    try {
      window.speechSynthesis.pause()
    } catch {
      // ignore
    }
  }, [])

  const resume = useCallback(() => {
    try {
      window.speechSynthesis.resume()
    } catch {
      // ignore
    }
  }, [])

  const stop = useCallback(() => {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
    setState('idle')
  }, [])

  const toggle = useCallback((text?: string) => {
    if (state === 'playing') {
      pause()
    } else if (state === 'paused') {
      resume()
    } else if (text) {
      speak(text)
    }
  }, [state, pause, resume, speak])

  return { state, voices, selectedVoiceName, setSelectedVoiceName, speak, pause, resume, stop, toggle }
}
