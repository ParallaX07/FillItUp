/* global browser */
// Google Forms DOM is subject to change; we use robust selectors where possible.
(function () {
  const STORAGE_PREFIX = 'gform:'

  function getFormIdFromUrl() {
    const m = location.pathname.match(/\/forms\/d\/e\/([^\/]+)/)
    if (m) return m[1]
    const m2 = location.pathname.match(/\/forms\/d\/([^\/]+)/)
    if (m2) return m2[1]
    return location.href
  }

  function getFormKey() {
    return STORAGE_PREFIX + getFormIdFromUrl()
  }

  function queryAll(selector, root = document) {
    return Array.from(root.querySelectorAll(selector))
  }

  function sanitizeText(s) {
    return (s || '').trim().replace(/\s+/g, ' ')
  }

  // Heuristic: each question is an element with role=listitem or has data-params
  function getQuestionNodes() {
    const items = queryAll('[role="listitem"].Qr7Oae, div[role="listitem"], div[jsname]')
    // Filter to those that have input controls inside
    return items.filter(it => it.querySelector('input, textarea, select'))
  }

  function getQuestionLabel(node) {
    // Try common selectors
    const labelEl = node.querySelector('.M7eMe, .aDTYNe, .Y2Zypf, .yUQOvf, .freebirdFormviewerComponentsQuestionBaseTitle, [role="heading"]')
    return sanitizeText(labelEl ? labelEl.textContent : '')
  }

  function getControlType(node) {
    if (node.querySelector('input[type="radio"], [role="radio"]')) return 'radio'
    if (node.querySelector('input[type="checkbox"]')) return 'checkbox'
    if (node.querySelector('textarea')) return 'textarea'
    // Google forms uses inputs with aria-label for short answer/number/email
    const txt = node.querySelector('input[type="text"], input[type="email"], input[type="number"], input[type="url"], input[type="tel"], input[type="date"], input[type="time"], input:not([type])')
    if (txt) return 'text'
    // Dropdowns use role=combobox and a menu
    if (node.querySelector('[role="combobox"], .quantumWizMenuPaperselectOptionList, .isMenuOpen')) return 'dropdown'
    return 'unknown'
  }

  function getOptions(node) {
    // For radios/checkboxes/dropdown capture visible option labels
    const opts = []
    // Radio/checkbox labels
    node.querySelectorAll('div[role="radio"], div[role="checkbox"], .docssharedWizToggleLabeledLabelText, .Od2TWd').forEach(el => {
      const label = sanitizeText(el.getAttribute('aria-label') || el.textContent)
      if (label) opts.push(label)
    })
    // Fallback: explicit label elements
    if (opts.length === 0) {
      node.querySelectorAll('label').forEach(l => {
        const s = sanitizeText(l.textContent)
        if (s) opts.push(s)
      })
    }
    return Array.from(new Set(opts))
  }

  function getRadioElements(node) {
    return queryAll('[role="radio"]', node)
  }

  function getRadioText(el) {
    // Prefer aria-label if provided; fallback to closest label or text
    const aria = el.getAttribute('aria-label')
    if (aria) return sanitizeText(aria)
    const lab = el.closest('label')
    if (lab) {
      const t = sanitizeText(lab.textContent)
      if (t) return t
    }
    return sanitizeText(el.textContent)
  }

  function capture() {
    const data = []
    const questions = getQuestionNodes()
    questions.forEach((q, idx) => {
      const type = getControlType(q)
      const label = getQuestionLabel(q)
      const entry = { index: idx, label, type }
      if (type === 'text' || type === 'textarea') {
        const input = q.querySelector('input, textarea')
        entry.value = input ? input.value : ''
      } else if (type === 'radio') {
        // Prefer ARIA radios used by Google Forms
        const ariaRadios = getRadioElements(q)
        let value = ''
        if (ariaRadios.length) {
          const sel = ariaRadios.find(el => (el.getAttribute('aria-checked') || '').toString() === 'true')
          if (sel) value = getRadioText(sel)
        } else {
          // Fallback to native inputs if present
          const radios = q.querySelectorAll('input[type="radio"]')
          radios.forEach(r => {
            if (r.checked) {
              const l = r.closest('label')
              value = sanitizeText(l ? l.textContent : '')
            }
          })
        }
        entry.value = value
        entry.options = getOptions(q)
      } else if (type === 'checkbox') {
        const boxes = q.querySelectorAll('input[type="checkbox"]')
        const values = []
        boxes.forEach(b => {
          if (b.checked) {
            const l = b.closest('label')
            const t = sanitizeText(l ? l.textContent : '')
            if (t) values.push(t)
          }
        })
        entry.value = values
        entry.options = getOptions(q)
      } else if (type === 'dropdown') {
        // Dropdown selected value shown in contenteditable/aria-*
        const display = q.querySelector('[role="listbox"], [role="combobox"], .quantumWizMenuPaperselectContent')
        entry.value = display ? sanitizeText(display.textContent) : ''
        entry.options = getOptions(q)
      } else {
        // unsupported types skipped
      }
      data.push(entry)
    })
    return data
  }

  async function save() {
    const key = getFormKey()
    const data = capture()
    await browser.storage.local.set({ [key]: data })
    return { ok: true, count: data.length }
  }

  function delay(ms) { return new Promise(res => setTimeout(res, ms)) }

  function setNativeValue(el, value) {
    const last = el.value
    el.value = value
    const ev = new Event('input', { bubbles: true })
    el.dispatchEvent(ev)
    if (last !== value) {
      const ch = new Event('change', { bubbles: true })
      el.dispatchEvent(ch)
    }
  }

  async function openDropdown(node) {
    // Click the combobox to open
    const btn = node.querySelector('[role="combobox"], .quantumWizMenuPaperselectToggle')
    if (btn) {
      btn.click()
      await delay(50)
    }
  }

  async function selectDropdownOption(text) {
    // Options may render in a global menu list
    const menu = document.querySelector('.exportSelectPopup, .quantumWizMenuPaperselectPopup') || document
    const candidates = queryAll('[role="option"], .quantumWizMenuPaperselectContent .exportContent', menu)
    const target = candidates.find(el => sanitizeText(el.textContent) === text)
                 || candidates.find(el => sanitizeText(el.textContent).toLowerCase() === text.toLowerCase())
    if (target) target.click()
    await delay(30)
  }

  async function fillOne(q, entry) {
    const type = getControlType(q)
    if (type !== entry.type) {
      // Still attempt best-effort based on control present
    }
    if (type === 'text' || type === 'textarea') {
      const input = q.querySelector('input, textarea')
      if (input) setNativeValue(input, entry.value || '')
    } else if (type === 'radio') {
      const targetText = String(entry.value || '').trim()
      const radios = getRadioElements(q)
      let target = null
      if (radios.length) {
        const lower = targetText.toLowerCase()
        target = radios.find(el => getRadioText(el) === targetText)
              || radios.find(el => getRadioText(el).toLowerCase() === lower)
        if (!target && lower) {
          // lenient contains match if unique
          const candidates = radios.filter(el => getRadioText(el).toLowerCase().includes(lower))
          if (candidates.length === 1) target = candidates[0]
        }
        if (target) {
          target.click()
          await delay(10)
          return
        }
      }
      // Fallback to label+input approach if ARIA radios not found
      const labels = queryAll('label', q)
      const match = labels.find(l => sanitizeText(l.textContent) === targetText)
                 || labels.find(l => sanitizeText(l.textContent).toLowerCase() === targetText.toLowerCase())
      if (match) {
        const input = match.querySelector('input[type="radio"]') || match
        input.click()
        await delay(10)
      }
    } else if (type === 'checkbox') {
      const want = new Set((entry.value || []).map(s => String(s).toLowerCase()))
      const labels = queryAll('label', q)
      labels.forEach(l => {
        const cb = l.querySelector('input[type="checkbox"]')
        if (!cb) return
        const text = sanitizeText(l.textContent).toLowerCase()
        const checked = !!cb.checked
        if (want.has(text) && !checked) l.click()
        if (!want.has(text) && checked) l.click()
      })
      await delay(10)
    } else if (type === 'dropdown') {
      await openDropdown(q)
      if (entry.value) await selectDropdownOption(entry.value)
    }
  }

  async function fillAll() {
    const key = getFormKey()
    const store = await browser.storage.local.get(key)
    const data = store[key]
    if (!Array.isArray(data)) return { ok: false, error: 'No saved data for this form' }
    const questions = getQuestionNodes()
    let count = 0
    for (let i = 0; i < data.length; i++) {
      const entry = data[i]
      const q = questions[entry.index]
      if (!q) continue
      await fillOne(q, entry)
      count++
    }
    return { ok: true, count }
  }

  async function clearSaved() {
    const key = getFormKey()
    await browser.storage.local.remove(key)
    return { ok: true }
  }

  browser.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.action) return
    if (msg.action === 'save') return save()
    if (msg.action === 'fill') return fillAll()
    if (msg.action === 'clear') return clearSaved()
  })
})()
