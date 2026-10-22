const form = document.getElementById('pair-form')
const input = document.getElementById('code')
const message = document.getElementById('message')
const forget = document.getElementById('forget')

const LAST = {
  ok: 'Paired. Kissa is receiving YouTube Music.',
  'not-paired': 'Not paired yet.',
  'no-kissa': 'Paired, but Kissa is not reachable right now.'
}

async function refresh() {
  const status = await chrome.runtime.sendMessage({ kind: 'status' })
  form.hidden = status.paired
  forget.hidden = !status.paired
  message.textContent = status.paired ? LAST[status.lastResult] || 'Paired with Kissa.' : 'Not paired yet.'
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  message.textContent = 'Pairing…'
  const result = await chrome.runtime.sendMessage({ kind: 'pair', code: input.value.trim() })
  message.textContent = result.ok ? 'Paired with Kissa.' : result.reason
  if (result.ok) void refresh()
})

forget.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ kind: 'forget' })
  void refresh()
})

void refresh()
