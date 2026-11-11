import { describe, expect, it } from 'vitest'
import { bugReportUrl, featureRequestUrl } from '../feedback'

describe('feedback links', () => {
  it('opens the feature form', () => {
    expect(featureRequestUrl()).toBe('https://github.com/NamanOG/Kissa/issues/new?template=feature_request.yml')
  })

  it('prefills the bug form with the version, build and Windows version, by field id', () => {
    const url = new URL(bugReportUrl({ version: '5.1.0', store: true, windows: 'Windows 11 Home (10.0.26300), x64' }))
    expect(url.origin + url.pathname).toBe('https://github.com/NamanOG/Kissa/issues/new')
    expect(url.searchParams.get('template')).toBe('bug_report.yml')
    expect(url.searchParams.get('version')).toBe('5.1.0')
    expect(url.searchParams.get('build')).toBe('Microsoft Store')
    expect(url.searchParams.get('windows')).toBe('Windows 11 Home (10.0.26300), x64')
  })

  it('leaves out what it does not know, and never carries line breaks', () => {
    const url = new URL(bugReportUrl({ version: '5.1.0\nextra', store: false }))
    expect(url.searchParams.get('version')).toBe('5.1.0 extra')
    expect(url.searchParams.get('build')).toBe('GitHub download')
    expect(url.searchParams.has('windows')).toBe(false)
  })
})
