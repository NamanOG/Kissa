import { describe, expect, it } from 'vitest'
import { CONNECTOR_STORE_LINKS, connectorIsAvailable } from '../youtubeMusicConnector'

describe('YouTube Music connector visibility', () => {
  it('stays hidden in the public build until a store link is set', () => {
    expect(CONNECTOR_STORE_LINKS).toEqual({ chrome: null, edge: null })
    expect(connectorIsAvailable(CONNECTOR_STORE_LINKS)).toBe(false)
    expect(connectorIsAvailable(CONNECTOR_STORE_LINKS, '')).toBe(false)
  })

  it('appears once either store listing exists, and only for https links', () => {
    expect(connectorIsAvailable({ chrome: 'https://chromewebstore.google.com/detail/x', edge: null })).toBe(true)
    expect(connectorIsAvailable({ chrome: null, edge: 'https://microsoftedge.microsoft.com/addons/detail/x' })).toBe(true)
    expect(connectorIsAvailable({ chrome: 'http://insecure.example', edge: null })).toBe(false)
  })

  it('the developer override shows it for local testing only', () => {
    expect(connectorIsAvailable(CONNECTOR_STORE_LINKS, '1')).toBe(true)
  })
})
