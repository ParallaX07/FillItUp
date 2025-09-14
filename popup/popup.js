// Polyfill to support both Firefox (browser) and Chromium (chrome)
const _browser = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null)

async function getActiveTab() {
  const tabs = await _browser.tabs.query({ active: true, currentWindow: true })
  return tabs[0]
}

function setStatus(text, ok = true) {
  const el = document.getElementById('status')
  el.textContent = text
  el.style.color = ok ? '#0a0' : '#a00'
}

async function messageActive(action) {
  const tab = await getActiveTab()
  try {
    const res = await _browser.tabs.sendMessage(tab.id, { action })
    return res
  } catch (e) {
    // content script might not be injected yet
    try {
      if (_browser.tabs.executeScript) {
        await _browser.tabs.executeScript(tab.id, { file: 'content/content_script.js' })
      }
      const res2 = await _browser.tabs.sendMessage(tab.id, { action })
      return res2
    } catch (err) {
      throw err
    }
  }
}

async function save() {
  setStatus('Saving…')
  const res = await messageActive('save')
  if (res && res.ok) setStatus(`Saved ${res.count} answers`) 
  else setStatus(res && res.error ? res.error : 'Save failed', false)
}

async function fill() {
  setStatus('Filling…')
  const res = await messageActive('fill')
  if (res && res.ok) setStatus(`Filled ${res.count} answers`) 
  else setStatus(res && res.error ? res.error : 'Fill failed', false)
}

async function clearSaved() {
  setStatus('Clearing…')
  const res = await messageActive('clear')
  if (res && res.ok) setStatus('Cleared saved answers') 
  else setStatus(res && res.error ? res.error : 'Clear failed', false)
}

addEventListener('DOMContentLoaded', () => {
  document.getElementById('save').addEventListener('click', save)
  document.getElementById('fill').addEventListener('click', fill)
  document.getElementById('clear').addEventListener('click', clearSaved)
})
