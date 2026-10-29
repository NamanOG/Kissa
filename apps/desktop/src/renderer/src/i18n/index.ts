import { useCallback } from 'react'
import { create } from 'zustand'
import { en, type MessageKey } from './en'
import { es } from './es'

/**
 * Kissa's own small translation layer: one dictionary per language, English as the fallback,
 * `{name}` placeholders. No library, because Kissa only needs plain strings.
 */
export type Language = 'en' | 'es'
export type LanguageChoice = 'auto' | Language
export type { MessageKey }

export const LANGUAGES: { id: Language; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' }
]

const DICTIONARIES: Record<Language, Partial<Record<MessageKey, string>>> = { en, es }
const STORAGE_KEY = 'kissa_language'

/** The language Windows (via Chromium) reports, narrowed to the ones Kissa has. */
export function systemLanguage(): Language {
  const tags = typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language] : []
  return tags.some((tag) => typeof tag === 'string' && tag.toLowerCase().startsWith('es')) ? 'es' : 'en'
}

export function resolveLanguage(choice: LanguageChoice): Language {
  return choice === 'auto' ? systemLanguage() : choice
}

function readChoice(): LanguageChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' || saved === 'es' || saved === 'auto' ? saved : 'auto'
  } catch {
    return 'auto'
  }
}

export function translate(language: Language, key: MessageKey, vars?: Record<string, string | number>): string {
  const text = DICTIONARIES[language][key] ?? en[key]
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text
}

/**
 * For names kept in data tables (rooms, finishes, pressings, scenes) and plain helpers: read in
 * the language chosen now. Components showing them re-render through useT on a change.
 */
export function tl(key: MessageKey, vars?: Record<string, string | number>): string {
  return translate(useLanguageStore.getState().language, key, vars)
}

interface LanguageState {
  choice: LanguageChoice
  language: Language
  setChoice: (choice: LanguageChoice) => void
}

export const useLanguageStore = create<LanguageState>((set) => {
  const choice = readChoice()
  return {
    choice,
    language: resolveLanguage(choice),
    setChoice: (next) => {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Not saved; still applies for this session.
      }
      const language = resolveLanguage(next)
      if (typeof document !== 'undefined') document.documentElement.lang = language
      set({ choice: next, language })
    }
  }
})

if (typeof document !== 'undefined') document.documentElement.lang = useLanguageStore.getState().language

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

/** `t('settings.title')` in the current language; re-renders when the language changes. */
export function useT(): Translate {
  const language = useLanguageStore((s) => s.language)
  return useCallback((key, vars) => translate(language, key, vars), [language])
}
