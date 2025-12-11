import type { LanguageCode, Dictionary } from '../types'
import extJa from '../locales-extension/ja.json'
import extZhTw from '../locales-extension/zh-TW.json'
import extZhCn from '../locales-extension/zh-CN.json'
import extKo from '../locales-extension/ko.json'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type Settings = { language: LanguageCode; enabled: boolean; strictMatching: boolean; useCdn: boolean }
type LocaleMeta = { source: 'primary' | 'secondary' | 'bundled'; fetchedAt?: number }

// ---------------------------------------------------------------------------
// CONSTANTS & CONFIGURATION
// ---------------------------------------------------------------------------

const DEFAULT_LANGUAGE: LanguageCode = 'ja'
const DEFAULT_SETTINGS: Settings = { language: DEFAULT_LANGUAGE, enabled: true, strictMatching: true, useCdn: true }

// Supported languages for the options UI (English + native label for clarity)
const LANGUAGES: Array<{ value: LanguageCode; label: string }> = [
  { value: 'ja', label: 'Japanese 日本語' },
  { value: 'zh-TW', label: 'Traditional Chinese 繁體中文' },
  { value: 'zh-CN', label: 'Simplified Chinese 简体中文' },
  { value: 'ko', label: 'Korean 한국어' }
]

const LOCALE_CACHE_KEY = 'cdnLocaleCache'

// Extension UI translations (used to localize the options page itself)
const EXTENSION_LOCALES: Record<Exclude<LanguageCode, 'off'>, Dictionary> = {
  ja: extJa,
  'zh-TW': extZhTw,
  'zh-CN': extZhCn,
  ko: extKo
}

// English fallback strings (when a translation is missing or language is off)
const FALLBACK_STRINGS: Dictionary = {
  options_title: 'Choose your Webflow UI language',
  options_description: 'This extension translates the UI of Webflow Dashboard and Designer. The goal is to make Webflow easier to use without distorting its terminology. It may not translate every term.',
  options_enable_label: 'Enable translation',
  options_enable_desc: 'Turn this off to keep Webflow in English.',
  options_status_idle: 'Choose the language you want to see in Webflow. More languages coming soon!',
  options_strict_label: 'Avoid partial translations (Recommended)',
  options_strict_desc: 'Only translate when the full text matches our translation phrase. Prevents partial phrase changes.',
  options_cdn_label: 'Use the latest translation updates',
  options_cdn_desc: 'Fetch the latest translations from CDN. Turn off to use only the bundled version.',
  options_contribute: 'Contribute on GitHub',
  footer_join: 'Join translations'
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

// Safely retrieve the storage area (Sync if available, otherwise Local)
function getStorage(): chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea {
  return chrome?.storage?.sync || chrome.storage.local
}

// Heavier cache reads should come from local when available
function getCacheStorage(): chrome.storage.LocalStorageArea | chrome.storage.SyncStorageArea {
  return chrome?.storage?.local || chrome.storage.sync
}

// Get a localized string for the Options UI (fallback to English)
function getText(lang: LanguageCode, key: string): string {
  if (lang === 'off') return FALLBACK_STRINGS[key] || ''
  const dict = EXTENSION_LOCALES[lang as Exclude<LanguageCode, 'off'>]
  return dict?.[key] || FALLBACK_STRINGS[key] || ''
}

// ---------------------------------------------------------------------------
// STATE MANAGEMENT
// ---------------------------------------------------------------------------

// Tracks the last rendered language to decide when a full re-render is needed
let lastRenderedLanguage: LanguageCode | null = null
// Holds the current application state
let currentSettings: Settings = { ...DEFAULT_SETTINGS }
// Latest locale source metadata (per language)
let latestLocaleMeta: Record<Exclude<LanguageCode, 'off'>, LocaleMeta> | null = null

// ---------------------------------------------------------------------------
// DOM RENDERING
// ---------------------------------------------------------------------------

// Main render: full re-render on language change, otherwise just sync values
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
  updateLocaleBadge(root, latestLocaleMeta, settings)
}

// Render the full options page for the selected language
function renderFullPage(root: HTMLElement, settings: Settings) {
  const lang = settings.language

  root.innerHTML = `
    <div class="options_shell">
      <div class="options_header">
        <div>
          <p class="eyebrow">Webflow UI Localization</p>
          <h1 class="title">${getText(lang, 'options_title')}</h1>
          <p class="lede">${getText(lang, 'options_description')}</p>
        </div>
        <a class="json_badge" id="cdn_json_badge" target="_blank" rel="noreferrer noopener"></a>
      </div>
    </div>
  `

  const container = document.createElement('div')
  container.className = 'options_card'
  root.querySelector('.options_shell')?.appendChild(container)

  // Enable toggle
  renderToggleItem(container, 'enabled', getText(lang, 'options_enable_label'), getText(lang, 'options_enable_desc'))

  // Status Message
  const status = document.createElement('p')
  status.className = 'status'
  status.id = 'status_msg'
  status.textContent = getText(lang, 'options_status_idle')
  container.appendChild(status)

  // Language radio list
  renderLanguageList(container)

  // Other toggles
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
            <span style="opacity: 0.6;">&#x2022;</span>
            <a href="https://github.com/SPACESODA/Webflow-UI-Localization" target="_blank" rel="noreferrer">${getText(lang, 'options_contribute')}</a>
        </p>
    </div>
    <p class="disclaimer" style="margin-bottom: 18px;">This extension provides unofficial translations that may not be accurate.</p>
    <p class="disclaimer">This extension is an independent project and is not affiliated with or endorsed by Webflow. Webflow is a trademark of Webflow, Inc.</p>
    <p class="disclaimer">This extension does not collect, store, or transmit any personal information or usage data.</p>
  `
  container.appendChild(footer)
}

// Render a checkbox toggle row
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

// Render the list of language radio buttons
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

// Sync inputs with current settings without recreating the DOM
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

function updateLocaleBadge(
  root: HTMLElement,
  meta: Record<Exclude<LanguageCode, 'off'>, LocaleMeta> | null,
  settings: Settings
) {
  const el = root.querySelector<HTMLElement>('#cdn_json_badge')
  if (!el) return
  const { language, useCdn } = settings
  const entry = meta?.[language as Exclude<LanguageCode, 'off'>]

  // Hide when language is off
  if (language === 'off') {
    el.textContent = ''
    el.removeAttribute('href')
    el.style.display = 'none'
    return
  }

  // If CDN is disabled, force bundled label regardless of cache
  if (!useCdn) {
    el.textContent = 'JSON: Bundled'
    el.removeAttribute('href')
    el.style.display = 'inline-block'
    return
  }

  // Otherwise show the fetched source or fall back to bundled
  if (!entry) {
    el.textContent = 'JSON: Bundled'
    el.removeAttribute('href')
    el.style.display = 'inline-block'
    return
  }

  const label =
    entry.source === 'primary' ? 'JSON: Cloudflare'
      : entry.source === 'secondary' ? 'JSON: jsDelivr'
        : 'JSON: Bundled'

  el.textContent = label
  el.removeAttribute('href')
  el.style.display = 'inline-block'
}

// ---------------------------------------------------------------------------
// EVENTS & INTERACTION
// ---------------------------------------------------------------------------

function bindEvents(root: HTMLElement) {
  const storage = getStorage()

  // Checkbox handlers (Enable, Strict, CDN)
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

  // Language selection handler
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
  const cacheStorage = getCacheStorage()

  // 1. Initial Load: Get settings and cache meta from storage
  storage.get({ ...DEFAULT_SETTINGS }, (items) => {
    cacheStorage.get({ [LOCALE_CACHE_KEY]: null }, (cacheItems) => {
      latestLocaleMeta = extractLocaleMeta((cacheItems as any)[LOCALE_CACHE_KEY])
      const settings = { ...DEFAULT_SETTINGS, ...items }
      renderApp(settings)
    })
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

    if (changes[LOCALE_CACHE_KEY]) {
      latestLocaleMeta = extractLocaleMeta(changes[LOCALE_CACHE_KEY].newValue)
      const root = document.getElementById('root')
      if (root) updateLocaleBadge(root, latestLocaleMeta, newSettings)
    }

    if (hasChange) {
      renderApp(newSettings)
    }
  })
}

function extractLocaleMeta(
  cache: Record<Exclude<LanguageCode, 'off'>, { source?: string; fetchedAt?: number }> | null
): Record<Exclude<LanguageCode, 'off'>, LocaleMeta> | null {
  if (!cache || typeof cache !== 'object') return null
  const meta: Partial<Record<Exclude<LanguageCode, 'off'>, LocaleMeta>> = {}
  Object.entries(cache).forEach(([code, entry]) => {
    const source = (entry as any)?.source
    if (source === 'primary' || source === 'secondary') {
      meta[code as Exclude<LanguageCode, 'off'>] = {
        source,
        fetchedAt: (entry as any)?.fetchedAt
      }
    }
  })
  return Object.keys(meta).length ? (meta as Record<Exclude<LanguageCode, 'off'>, LocaleMeta>) : null
}
