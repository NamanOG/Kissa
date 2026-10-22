// The connector's background worker. It talks only to the Kissa app on this PC
// (http://127.0.0.1, see manifest) and only after being paired with a code Kissa shows.
// No accounts, no cookies, no history, no audio, no cloud.

const PORTS = [47321, 47322, 47323]
/** Per tab: the latest state from a music.youtube.com tab. */
const tabs = new Map()

async function settings() {
  return chrome.storage.local.get({ token: '', port: 0 })
}

async function findKissa(preferred) {
  const order = preferred ? [preferred, ...PORTS.filter((p) => p !== preferred)] : PORTS
  for (const port of order) {
    try {
      // A POST, so Chrome includes this extension's Origin and Kissa can verify it.
      const res = await fetch(`http://127.0.0.1:${port}/v1/hello`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(800)
      })
      if (res.ok && (await res.json()).app === 'kissa') return port
    } catch {
      // Not this port.
    }
  }
  return 0
}

async function send(body) {
  const { token, port } = await settings()
  if (!token) return { ok: false, reason: 'not-paired' }
  const tryPort = async (p) =>
    fetch(`http://127.0.0.1:${p}/v1/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1500)
    })
  try {
    let res = port ? await tryPort(port).catch(() => null) : null
    if (!res) {
      const found = await findKissa(port)
      if (!found) return { ok: false, reason: 'no-kissa' }
      await chrome.storage.local.set({ port: found })
      res = await tryPort(found)
    }
    if (res.status === 401) {
      await chrome.storage.local.set({ token: '' })
      return { ok: false, reason: 'not-paired' }
    }
    return { ok: res.ok || res.status === 422 }
  } catch {
    return { ok: false, reason: 'no-kissa' }
  }
}

/** One report for Kissa: a playing tab wins, otherwise the most recent one. */
function current() {
  let best = null
  for (const entry of tabs.values()) {
    if (!best) best = entry
    else if (entry.state.playing && !best.state.playing) best = entry
    else if (entry.state.playing === best.state.playing && entry.at > best.at) best = entry
  }
  return best ? best.state : null
}

async function publish() {
  const state = current()
  const result = await send(state ?? { v: 1, gone: true })
  await chrome.storage.local.set({ lastResult: result.ok ? 'ok' : result.reason, lastAt: Date.now() })
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message && message.kind === 'pair') {
    void pair(String(message.code || '')).then(reply)
    return true
  }
  if (message && message.kind === 'status') {
    void settings().then(async ({ token }) => {
      const { lastResult, lastAt } = await chrome.storage.local.get({ lastResult: '', lastAt: 0 })
      reply({ paired: Boolean(token), lastResult, lastAt })
    })
    return true
  }
  if (message && message.kind === 'forget') {
    void chrome.storage.local.set({ token: '' }).then(() => reply({ paired: false }))
    return true
  }
  // Only the content script on music.youtube.com sends these.
  const tabId = sender.tab && sender.tab.id
  if (tabId === undefined || !sender.url || !sender.url.startsWith('https://music.youtube.com/')) return
  if (message && message.kind === 'state' && message.state) tabs.set(tabId, { state: message.state, at: Date.now() })
  else if (message && message.kind === 'gone') tabs.delete(tabId)
  else return
  void publish()
})

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabs.delete(tabId)) void publish()
})

async function pair(code) {
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: 'Enter the six digits Kissa shows.' }
  const { port } = await settings()
  const found = await findKissa(port)
  if (!found) return { ok: false, reason: 'Kissa is not reachable. Open Kissa and turn on "Also share YouTube Music" in Settings.' }
  try {
    const res = await fetch(`http://127.0.0.1:${found}/v1/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(2000)
    })
    if (!res.ok) return { ok: false, reason: res.status === 409 ? 'In Kissa, press "Show pairing code" first.' : 'That code did not match.' }
    const { token } = await res.json()
    await chrome.storage.local.set({ token, port: found })
    return { ok: true }
  } catch {
    return { ok: false, reason: 'Kissa did not answer.' }
  }
}
