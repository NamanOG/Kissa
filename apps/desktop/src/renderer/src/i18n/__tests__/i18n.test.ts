import { describe, expect, it } from 'vitest'
import { en } from '../en'
import { es } from '../es'
import { resolveLanguage, translate, useLanguageStore } from '..'

describe('translate', () => {
  it('uses the chosen language and fills placeholders', () => {
    expect(translate('es', 'settings.title')).toBe('Ajustes')
    expect(translate('en', 'turntable.finish', { finish: 'Studio Silver' })).toBe('Studio Silver finish')
  })

  it('falls back to English for a key the language leaves out', () => {
    expect(es['about.kissa']).toBeUndefined()
    expect(translate('es', 'about.kissa')).toBe(en['about.kissa'])
  })

  it('has Spanish for every English key except names that stay the same', () => {
    const sameInEveryLanguage = new Set(['about.kissa', 'sharing.discord'])
    const missing = Object.keys(en).filter((key) => !sameInEveryLanguage.has(key) && !(key in es))
    expect(missing).toEqual([])
  })

  it('only has Spanish keys that exist in English', () => {
    for (const key of Object.keys(es)) expect(key in en).toBe(true)
  })
})

describe('language choice', () => {
  it('resolves an explicit choice and remembers it', () => {
    expect(resolveLanguage('es')).toBe('es')
    useLanguageStore.getState().setChoice('es')
    expect(useLanguageStore.getState().language).toBe('es')
    expect(localStorage.getItem('kissa_language')).toBe('es')
    expect(document.documentElement.lang).toBe('es')
    useLanguageStore.getState().setChoice('auto')
    expect(useLanguageStore.getState().language).toBe('en')
  })
})
