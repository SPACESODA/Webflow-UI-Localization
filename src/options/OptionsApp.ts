import type { LanguageCode, Dictionary } from '../types'
import extJa from '../locales-extension/ja.json'
import extZhTw from '../locales-extension/zh-TW.json'
import extZhCn from '../locales-extension/zh-CN.json'
import extKo from '../locales-extension/ko.json'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type Settings = { language: LanguageCode; enabled: boolean; strictMatching: boolean; useCdn: boolean }

// ---------------------------------------------------------------------------
// CONSTANTS & CONFIGURATION
// ---------------------------------------------------------------------------

const DEFAULT_LANGUAGE: LanguageCode = 'ja'
const DEFAULT_SETTINGS: Settings = { language: DEFAULT_LANGUAGE, enabled: true, strictMatching: true, useCdn: true }

/**
 * Supported languages in the Options UI.
 * Label combines English and Native name for clarity.
 */
const LANGUAGES: Array<{ value: LanguageCode; label: string }> = [
  { value: 'ja', label: 'Japanese 日本語' },
  { value: 'zh-TW', label: 'Traditional Chinese 繁體中文' },
  { value: 'zh-CN', label: 'Simplified Chinese 简体中文' },
  { value: 'ko', label: 'Korean 한국어' }
]

/**
 * Map of language codes to their respective extension-specific locale JSONs.
 * Used to translate the Options page UI itself.
 */
const EXTENSION_LOCALES: Record<Exclude<LanguageCode, 'off'>, Dictionary> = {
  ja: extJa,
  'zh-TW': extZhTw,
  'zh-CN': extZhCn,
  ko: extKo
}

/**
 * Fallback English strings.
 * Used when the selected language's translation is missing or language is 'off'.
 */
const FALLBACK_STRINGS: Dictionary = {
  options_title: 'Choose your Webflow UI language',
  options_description: 'This extension translates the UI of Webflow Dashboard and Designer. The goal is to make Webflow easier to use without distorting its terminology. It may not translate every term.',
  options_enable_label: 'Enable translation',
  options_enable_desc: 'Turn this off to keep Webflow in English.',
  options_status_idle: 'Choose the language you want to see in Webflow. More languages coming soon!',
  options_strict_label: 'Avoid partial translations (Recommended)',
  options_strict_desc: 'Only translate when the full text matches our translation phrase. Prevents partial phrase changes.',
  options_cdn_label: 'Use the latest translation updates',
  options_cdn_desc: 'Fetch the latest community translations from CDN. Turn off to use only the bundled version.',
  options_contribute: 'Contribute on GitHub',
  footer_join: 'Join translations'
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Safely retrieve the storage area (Sync if available, otherwise Local).
 */
function getStorage(): chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea {
  return chrome?.storage?.sync || chrome.storage.local
}

/**
 * Get a localized string for the Options UI.
 * Falls back to English if the translation is missing.
 */
function getText(lang: LanguageCode, key: string): string {
  if (lang === 'off') return FALLBACK_STRINGS[key] || ''
  const dict = EXTENSION_LOCALES[lang as Exclude<LanguageCode, 'off'>]
  return dict?.[key] || FALLBACK_STRINGS[key] || ''
}

// ---------------------------------------------------------------------------
// STATE MANAGEMENT
// ---------------------------------------------------------------------------

// Tracks the last rendered language to determine if a full re-render is needed.
let lastRenderedLanguage: LanguageCode | null = null
// Holds the current application state.
let currentSettings: Settings = { ...DEFAULT_SETTINGS }

// ---------------------------------------------------------------------------
// DOM RENDERING
// ---------------------------------------------------------------------------

/**
 * Main render function.
 * Decides whether to do a full page re-render (language change) or just update input values.
 */
function renderApp(settings: Settings) {
  currentSettings = settings
  const root = document.getElementById('root')
  if (!root) return

  // Full re-render needed if language changed (to update UI text)
  if (lastRenderedLanguage !== settings.language) {
    lastRenderedLanguage = settings.language
    renderFullPage(root, settings)
    bindEvents(root) // Re-bind events after DOM changes
  }

  // Always update input states (checked/disabled) to match settings
  updateValues(root, settings)
}

/**
 * Renders the entire HTML structure of the page, localized to `settings.language`.
 */
function renderFullPage(root: HTMLElement, settings: Settings) {
  const lang = settings.language

  root.innerHTML = `
    <div class="options_shell">
      <div>
        <p class="eyebrow">Webflow UI Localization</p>
        <h1 class="title">${getText(lang, 'options_title')}</h1>
        <p class="lede">${getText(lang, 'options_description')}</p>
      </div>
    </div>
  `

  const container = document.createElement('div')
  container.className = 'options_card'
  root.querySelector('.options_shell')?.appendChild(container)

  // 1. Enable Toggle
  renderToggleItem(container, 'enabled', getText(lang, 'options_enable_label'), getText(lang, 'options_enable_desc'))

  // Status Message
  const status = document.createElement('p')
  status.className = 'status'
  status.id = 'status_msg'
  status.textContent = getText(lang, 'options_status_idle')
  container.appendChild(status)

  // 2. Language Radio List
  renderLanguageList(container)

  // 3. Other Toggles
  renderToggleItem(container, 'strictMatching', getText(lang, 'options_strict_label'), getText(lang, 'options_strict_desc'))
  renderToggleItem(container, 'useCdn', getText(lang, 'options_cdn_label'), getText(lang, 'options_cdn_desc'))

  // Footer
  const footer = document.createElement('div')
  footer.className = 'footer'

  footer.innerHTML = `
    <div class="footer_divider"></div>
    <div class="footer_meta">
        <p class="credit">Made with &hearts; by <a href="https://x.com/anthonycxc" target="_blank" rel="noreferrer">Anthony C.</a></p>
        <p class="links">
            <a href="https://poeditor.com/join/project/7drFUDh3dh" target="_blank" rel="noreferrer">${getText(lang, 'footer_join')}</a>
            ·
            <a href="https://github.com/SPACESODA/Webflow-UI-Localization" target="_blank" rel="noreferrer">${getText(lang, 'options_contribute')}</a>
        </p>
    </div>
    <p class="disclaimer" style="margin-bottom: 8px;">This extension provides unofficial translations that may not be accurate.</p>
    <p class="disclaimer">This extension is an independent project and is not affiliated with or endorsed by Webflow. Webflow is a trademark of Webflow, Inc.</p>
    <p class="disclaimer">This extension does not collect, store, or transmit any personal information or usage data.</p>
  `
  container.appendChild(footer)
}

/**
 * Helper to render a checkbox toggle row.
 */
function renderToggleItem(parent: HTMLElement, name: string, title: string, desc: string) {
  const label = document.createElement('label')
  label.className = 'toggle'
  label.innerHTML = `
    <input type="checkbox" name="${name}">
    <span class="toggle_track"><span class="toggle_thumb"></span></span>
    <div class="toggle_text"><strong>${title}</strong><span>${desc}</span></div>
  `
  parent.appendChild(label)
}

/**
 * Helper to render the list of language radio buttons.
 */
function renderLanguageList(parent: HTMLElement) {
  const form = document.createElement('form')
  form.id = 'language-form'

  LANGUAGES.forEach((item) => {
    const label = document.createElement('label')
    label.className = 'language_option'
    label.innerHTML = `
        <input type="radio" name="language" value="${item.value}">
        <span class="language_name">${item.label}</span>
    `
    form.appendChild(label)
  })
  parent.appendChild(form)
}

/**
 * Updates DOM elements (checkboxes, radios) to match the current settings object.
 * Does not re-create DOM elements, only updates properties.
 */
function updateValues(root: HTMLElement, settings: Settings) {
  // Update Toggles
  const toggles = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
  toggles.forEach(box => {
    const key = box.name as keyof Settings
    if (key in settings) {
      box.checked = Boolean(settings[key])
    }
  })

  // Update Selected Language
  const langRadio = root.querySelector<HTMLInputElement>(`input[name="language"][value="${settings.language}"]`)
  if (langRadio) langRadio.checked = true

  // Handle Disabled State (when extension is disabled)
  const form = root.querySelector('#language-form')
  if (form) {
    if (settings.enabled) form.removeAttribute('data-disabled')
    else form.setAttribute('data-disabled', 'true')

    const radios = form.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    radios.forEach(r => r.disabled = !settings.enabled)
  }
}

// ---------------------------------------------------------------------------
// EVENTS & INTERACTION
// ---------------------------------------------------------------------------

function bindEvents(root: HTMLElement) {
  const storage = getStorage()

  // 1. Checkbox Handlers (Enable, Strict, CDN)
  const toggles = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
  toggles.forEach(box => {
    box.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      const key = target.name
      const val = target.checked

      // Optimistic UI update for 'enabled' toggle
      if (key === 'enabled') {
        updateValues(root, { ...currentSettings, enabled: val })
      }

      // Save to storage
      storage.set({ [key]: val }, () => {
        setStatusMsg(root, 'Saved')
      })
    })
  })

  // 2. Language Selection Handler
  const form = root.querySelector('#language-form')
  form?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement
    if (target.name === 'language') {
      const val = target.value as LanguageCode

      // Saving language triggers 'onChanged', which will call renderApp() and re-render the page.
      storage.set({ language: val, enabled: true }, () => {
        setStatusMsg(root, 'Saved')
      })

      // Updates internal state loosely until the re-render happens
      currentSettings.language = val
      currentSettings.enabled = true
    }
  })
}

function setStatusMsg(root: HTMLElement, msg: string) {
  const el = root.querySelector('#status_msg') as HTMLElement
  if (el) {
    el.textContent = msg
    el.dataset.status = 'changed'
    setTimeout(() => {
      // Revert to idle message if still in 'changed' state
      if (el.dataset.status === 'changed') {
        el.textContent = getText(currentSettings.language, 'options_status_idle')
        el.dataset.status = 'idle'
      }
    }, 2000)
  }
}

// ---------------------------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------------------------

export default function initOptionsPage() {
  const storage = getStorage()

  // 1. Initial Load: Get settings from storage and render
  storage.get(DEFAULT_SETTINGS, (items) => {
    const settings = { ...DEFAULT_SETTINGS, ...items }
    renderApp(settings)
  })

  // 2. Storage Listener: Handle updates from other tabs/contexts
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' && area !== 'local') return

    const newSettings = { ...currentSettings }
    let hasChange = false

      // Update settings object with any changed values
      ; (Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>).forEach(key => {
        if (changes[key]) {
          // @ts-ignore
          newSettings[key] = changes[key].newValue
          hasChange = true
        }
      })

    if (hasChange) {
      renderApp(newSettings)
    }
  })
}
