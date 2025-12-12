import ja from '../locales/ja.json'
import zhTw from '../locales/zh-TW.json'
import zhCn from '../locales/zh-CN.json'
import ko from '../locales/ko.json'
import th from '../locales/th.json'
import fr from '../locales/fr.json'
import { injectDashboardFooter } from './injections'
import type { LanguageCode, Dictionary } from '../types'

type Replacement = {
  regex: RegExp
  replacement: string | ((substring: string, ...args: any[]) => string)
  marker?: string
}

type Settings = { language: LanguageCode; enabled: boolean; strictMatching: boolean; useCdn: boolean }

const BUNDLED_LANGUAGES: Record<Exclude<LanguageCode, 'off'>, Dictionary> = {
  ja,
  'zh-TW': zhTw,
  'zh-CN': zhCn,
  ko,
  th,
  fr
}

const DEFAULT_LANGUAGE: Exclude<LanguageCode, 'off'> = 'ja'
const DEFAULT_SETTINGS: Settings = { language: DEFAULT_LANGUAGE, enabled: true, strictMatching: true, useCdn: true }
const FLEXIBLE_STRICT_WHITESPACE = true
const initialDocumentLang = document.documentElement?.getAttribute('lang') || 'en'

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'IFRAME',
  'CANVAS',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION'
])

import { EXCLUDED_SELECTORS } from './exclusion-selectors'

const IGNORE_PATTERN = EXCLUDED_SELECTORS.join(',')


let activeReplacements: Replacement[] = []
let activeExactReplacements: Map<string, string> = new Map()
let reverseReplacements: Replacement[] = []
let reverseExactReplacements: Map<string, string> = new Map()
let currentLanguage: Exclude<LanguageCode, 'off'> = DEFAULT_LANGUAGE
let isEnabled = true
let strictMatching = true
let latestSettings: Settings = DEFAULT_SETTINGS
let loadedLanguages: Record<Exclude<LanguageCode, 'off'>, Dictionary> = { ...BUNDLED_LANGUAGES }
let observer: MutationObserver | null = null
let flushScheduled = false

const pendingTextNodes = new Set<Text>()
const pendingElements = new Set<Element>()
const LOCALE_PRIMARY_BASE = 'https://webflow-ui-localization.pages.dev/src/locales'
const LOCALE_SECONDARY_BASE =
  'https://cdn.jsdelivr.net/gh/SPACESODA/Webflow-UI-Localization@latest/src/locales'
const LOCALE_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
import { LOCALE_CACHE_KEY } from '../constants'
// const LOCALE_CACHE_KEY = 'cdnLocaleCache_v1'
type CachedLocaleEntry = { dictionary: Dictionary; fetchedAt: number; source: 'primary' | 'secondary' }
let localeCache: Record<Exclude<LanguageCode, 'off'>, CachedLocaleEntry> = {} as any
let cacheLoaded = false


function isDevtoolsNode(node: Node): boolean {
  if (!(node instanceof Element)) return false
  const id = node.id || ''
  if (id.startsWith('__web-inspector')) return true
  const className = typeof node.className === 'string' ? node.className : ''
  if (className.includes('devtools')) return true
  return false
}

function shouldProcessNode(node: Node): boolean {
  if (isDevtoolsNode(node)) return false
  return true
}


function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ')
}

function buildFlexiblePattern(value: string): string {
  return normalizeWhitespace(value)
    .split(' ')
    .map((segment) => escapeRegExp(segment))
    .join('\\s+')
}

function findBestMarker(source: string): string | undefined {
  const textOnly = source.replace(/\{[^}]+\}/g, ' ')
  const matches = textOnly.match(/[\p{L}\p{N}]+/gu)
  if (!matches) return undefined
  matches.sort((a, b) => b.length - a.length)
  if (matches[0] && matches[0].length >= 2) return matches[0]
  return undefined
}

function buildTokenizedReplacement(
  sourceString: string,
  targetString: string,
  flexible: boolean
): Replacement {
  // 1. Build Regex Pattern & Identify Tokens
  // Split keeps placeholder names because the capturing group is retained.
  // We iterate through the split parts once to populate `tokenNames`
  // so they exactly match the capture groups in the generated regex.
  const parts = sourceString.split(/\{([^}]+)\}/g)

  const toPattern = flexible ? buildFlexiblePattern : escapeRegExp
  const tokenNames: string[] = []

  let patternString = '^(\\s*)'

  parts.forEach((part, index) => {
    const isToken = index % 2 === 1
    if (isToken) {
      // it is a token (e.g. "name" from "{name}")
      // reconstruct the token with braces for identification
      const tokenName = `{${part}}`
      tokenNames.push(tokenName)

      // require at least one character to capture
      patternString += '(.+?)'
    } else if (part) {
      // static text
      patternString += toPattern(part)
    }
  })

  patternString += '(\\s*)$'
  const regex = new RegExp(patternString)
  const marker = findBestMarker(sourceString)

  // 2. Build Replacement Function
  const replacement = (_match: string, ...args: any[]) => {
    // args: [leading, t1, t2, ..., tN, trailing, offset, string]
    // leading = args[0]
    // trailing = args[tokenNames.length + 1]

    const leading = args[0]
    const trailing = args[tokenNames.length + 1]

    // map token names to captured values
    const valuePool: Record<string, string[]> = {}

    tokenNames.forEach((tokenName, i) => {
      if (!valuePool[tokenName]) valuePool[tokenName] = []
      valuePool[tokenName].push(args[i + 1])
    })

    // copy pool to manage consumption of values
    const currentPool = { ...valuePool }
    for (const k in currentPool) {
      currentPool[k] = [...currentPool[k]]
    }

    // replace tokens in the target string with captured values
    const targetTokenRegex = /\{[^}]+\}/g

    const result = targetString.replace(targetTokenRegex, (token) => {
      if (currentPool[token] && currentPool[token].length > 0) {
        return currentPool[token].shift()!
      }

      // warn if missing a value for a placeholder (e.g. typo in translation or missing var)
      console.warn(`[Webflow-Localization] Missing value for token "${token}" in translation for: "${sourceString}"`)

      return token // leave placeholder as is
    })

    return `${leading}${result}${trailing}`
  }

  return { regex, replacement, marker }
}

function buildReplacements(dictionary: Dictionary, strict: boolean): { exact: Map<string, string>, complex: Replacement[] } {
  const entries = Object.entries(dictionary)
    // Treat empty strings as untranslated so we display the original text
    .filter(([_, replacement]) => replacement !== '')
    .sort(([a], [b]) => b.length - a.length)
  const exact = new Map<string, string>()
  const complex: Replacement[] = []

  if (strict) {
    entries.forEach(([source, replacement]) => {
      // 1. Complex Match: if source has placeholders, use regex
      if (source.includes('{') && source.includes('}')) {
        complex.push(buildTokenizedReplacement(source, replacement, FLEXIBLE_STRICT_WHITESPACE))
      } else {
        // 2. Exact Match Optimization: use Map for O(1) lookup
        const key = normalizeWhitespace(source).trim()
        if (key) {
          exact.set(key, replacement)
        }
      }
    })
    return { exact, complex }
  }

  // Non-strict mode always uses regex for partial matching (Legacy behavior)
  const legacyReplacements = entries.map(([source, replacement]: [string, string]) => ({
    regex: new RegExp(escapeRegExp(source), 'g'),
    replacement,
    marker: source.slice(0, 6)
  }))

  return { exact: new Map(), complex: legacyReplacements }
}

function buildReverseReplacements(dictionary: Dictionary, strict: boolean): { exact: Map<string, string>, complex: Replacement[] } {
  const entries = Object.entries(dictionary)
    // Ignore empty translations when reverting to avoid clearing text
    .filter(([_, replacement]) => replacement !== '')
    .sort(([a], [b]) => b.length - a.length)
  const exact = new Map<string, string>()
  const complex: Replacement[] = []

  if (strict) {
    entries.forEach(([source, replacement]) => {
      // Reverse direction: replacement is the key
      if (replacement.includes('{') && replacement.includes('}')) {
        complex.push(buildTokenizedReplacement(replacement, source, FLEXIBLE_STRICT_WHITESPACE))
      } else {
        const key = normalizeWhitespace(replacement).trim()
        if (key) {
          exact.set(key, source)
        }
      }
    })
    return { exact, complex }
  }

  const legacyReplacements = entries.map(([source, replacement]: [string, string]) => ({
    regex: new RegExp(escapeRegExp(replacement), 'g'),
    replacement: source,
    marker: replacement.slice(0, 6)
  }))

  return { exact: new Map(), complex: legacyReplacements }
}

function maybeContains(text: string, marker?: string) {
  if (!marker) return true
  return text.includes(marker)
}

function applyReplacements(
  text: string,
  replacements: Replacement[],
  exactMap: Map<string, string>
): { updated: string; changed: boolean } {
  if (!text.trim()) return { updated: text, changed: false }

  // 1. Exact Match Optimization (Strict Mode)
  // O(1) lookup for identifying common UI elements instantly.
  if (exactMap.size > 0) {
    const normalized = normalizeWhitespace(text).trim()
    if (exactMap.has(normalized)) {
      const replacement = exactMap.get(normalized)!

      // preserve leading/trailing whitespace from original text
      const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/)
      if (match) {
        return { updated: match[1] + replacement + match[3], changed: true }
      }
    }
  }

  // 2. Complex/Partial Match
  // Iterates through regex patterns for dynamic content (e.g. placeholders).
  if (!replacements.length) return { updated: text, changed: false }

  let updated = text
  let changed = false

  for (let i = 0; i < replacements.length; i += 1) {
    const { regex, replacement, marker } = replacements[i]
    if (!maybeContains(updated, marker)) continue
    let next: string
    if (typeof replacement === 'function') {
      next = updated.replace(regex, replacement)
    } else {
      next = updated.replace(regex, replacement)
    }
    if (next !== updated) {
      updated = next
      changed = true
    }
  }

  return { updated, changed }
}

function translateTextNode(node: Text) {
  if (!isEnabled) return
  const { updated, changed } = applyReplacements(node.data, activeReplacements, activeExactReplacements)
  if (changed) {
    node.data = updated
  }
}

function revertTextNode(node: Text) {
  // We removed the isEnabled check here because applySettings calls this
  // specifically to clear existing translations *while* isEnabled is still true
  // (before switching to the new language).
  // The caller is responsible for deciding when to revert.

  const { updated, changed } = applyReplacements(node.data, reverseReplacements, reverseExactReplacements)
  if (changed) {
    node.data = updated
  }
}

let titleObserver: MutationObserver | null = null

function translateTitle() {
  if (!isEnabled) return

  const current = document.title
  const { updated, changed } = applyReplacements(current, activeReplacements, activeExactReplacements)

  if (changed && updated !== current) {
    document.title = updated
  }
}

function revertTitle() {
  // Removed isEnabled check for same reason as revertTextNode
  const current = document.title
  const { updated, changed } = applyReplacements(current, reverseReplacements, reverseExactReplacements)
  if (changed) {
    document.title = updated
  }
}

const handleTitleMutations: MutationCallback = () => {
  // When title changes (by app or by us)
  // Logic: if the app overwrites our title with English, we re-apply translation.
  // The infinite loop is prevented by checking if translation is actually needed
  // inside translateTitle (via applyReplacements check).
  if (isEnabled) {
    translateTitle()
  }
}

function observeTitle() {
  const titleEl = document.querySelector('title')
  if (!titleEl) return // Should observe head if title doesn't exist yet? Webflow usually has it.

  if (!titleObserver) {
    titleObserver = new MutationObserver(handleTitleMutations)
  } else {
    titleObserver.disconnect()
  }

  titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true })
}

function disconnectTitleObserver() {
  if (titleObserver) {
    titleObserver.disconnect()
    titleObserver = null
  }
}


function shouldSkipTextNode(textNode: Text) {
  const parent = textNode.parentElement
  if (!parent) return true
  if (SKIP_TAGS.has(parent.tagName)) return true
  if (parent.isContentEditable) return true
  if (IGNORE_PATTERN && IGNORE_PATTERN.trim() && parent.closest(IGNORE_PATTERN)) return true
  if (!textNode.textContent?.trim()) return true
  return false
}

function translateWithin(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(textNode) {
      return shouldSkipTextNode(textNode as Text) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    }
  })

  let current = walker.nextNode() as Text | null
  while (current) {
    translateTextNode(current)
    current = walker.nextNode() as Text | null
  }
}

function revertWithin(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(textNode) {
      return shouldSkipTextNode(textNode as Text) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    }
  })

  let current = walker.nextNode() as Text | null
  while (current) {
    revertTextNode(current)
    current = walker.nextNode() as Text | null
  }
}


function translatePlaceholder(element: HTMLInputElement | HTMLTextAreaElement) {
  if (!isEnabled) return
  const current = element.placeholder
  if (!current) return

  const { updated, changed } = applyReplacements(current, activeReplacements, activeExactReplacements)
  if (changed) {
    element.placeholder = updated
  }
}

function revertPlaceholder(element: HTMLInputElement | HTMLTextAreaElement) {
  const current = element.placeholder
  if (!current) return

  const { updated, changed } = applyReplacements(current, reverseReplacements, reverseExactReplacements)
  if (changed) {
    element.placeholder = updated
  }
}

function translatePlaceholdersWithin(root: Node) {
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      translatePlaceholder(el as HTMLInputElement | HTMLTextAreaElement)
    }
    const inputs = el.querySelectorAll('input[placeholder], textarea[placeholder]')
    inputs.forEach((input) => translatePlaceholder(input as HTMLInputElement | HTMLTextAreaElement))
  }
}

function revertPlaceholdersWithin(root: Node) {
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      revertPlaceholder(el as HTMLInputElement | HTMLTextAreaElement)
    }
    const inputs = el.querySelectorAll('input[placeholder], textarea[placeholder]')
    inputs.forEach((input) => revertPlaceholder(input as HTMLInputElement | HTMLTextAreaElement))
  }
}

function flushPending() {
  flushScheduled = false
  if (!document.body) return

  // Suspend observers to prevent infinite loops and performance issues.
  // This is critical: modifying the DOM while observing it would trigger
  // immediate recursion, freezing the browser.
  if (observer) observer.disconnect()
  if (titleObserver) titleObserver.disconnect()



  const textNodes = Array.from(pendingTextNodes)
  const elements = Array.from(pendingElements)

  pendingTextNodes.clear()
  pendingElements.clear()

  if (isEnabled) {
    textNodes.forEach((text) => translateTextNode(text))
    elements.forEach((element) => {
      translateWithin(element)
      translatePlaceholdersWithin(element)
    })
  } else {
    textNodes.forEach((text) => revertTextNode(text))
    elements.forEach((element) => {
      revertWithin(element)
      revertPlaceholdersWithin(element)
    })
  }

  injectDashboardFooter(currentLanguage, isEnabled, (updates: any) => {
    applySettings({ ...latestSettings, ...updates })
  })



  // Resume observers
  if (isEnabled) {
    observeDocument()
    observeTitle()
  }

  // If new mutations occurred during the flush (rare but possible),
  // schedule another pass to handle them.
  if (pendingTextNodes.size || pendingElements.size) {
    scheduleFlush()
  }
}



function scheduleFlush() {
  if (flushScheduled) return
  flushScheduled = true

  const runner = () => {
    flushPending()
  }

  // Use requestAnimationFrame to update before the next repaint.
  // This minimizes the "flash of untranslated content" for dynamic UI elements.
  requestAnimationFrame(runner)
}

const handleDocumentMutations: MutationCallback = (mutations) => {
  mutations.forEach((mutation) => {
    if (!shouldProcessNode(mutation.target)) {
      return
    }

    if (mutation.type === 'characterData') {
      if (mutation.target.nodeType === Node.TEXT_NODE) {
        pendingTextNodes.add(mutation.target as Text)
      }
    } else if (mutation.type === 'attributes' && mutation.attributeName === 'placeholder') {
      // optimization: we track the element so we can rescan its placeholders
      const target = mutation.target as HTMLInputElement | HTMLTextAreaElement
      pendingElements.add(target)
    }

    mutation.addedNodes.forEach((node) => {
      if (!shouldProcessNode(node)) return
      if (node.nodeType === Node.TEXT_NODE) {
        pendingTextNodes.add(node as Text)
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        pendingElements.add(node as Element)
      }
    })
  })

  if (pendingTextNodes.size || pendingElements.size) {
    scheduleFlush()
  }
}

function observeDocument() {
  if (!observer) {
    observer = new MutationObserver(handleDocumentMutations)
  } else {
    observer.disconnect()
  }

  observer.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['placeholder']
  })
}

function disconnectObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  pendingTextNodes.clear()
  pendingElements.clear()
}

function getStorage(): chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea {
  if (chrome?.storage?.sync) return chrome.storage.sync
  return chrome.storage.local
}

function getCacheStorage(): chrome.storage.LocalStorageArea | chrome.storage.SyncStorageArea {
  // Cache can be larger; prefer local to avoid sync quotas.
  if (chrome?.storage?.local) return chrome.storage.local
  return chrome.storage.sync
}

function getSavedSettings(): Promise<Settings> {
  const storage = getStorage()
  return new Promise((resolve) => {
    storage.get(DEFAULT_SETTINGS, (result) => {
      const language = (result.language as LanguageCode) ?? DEFAULT_LANGUAGE
      const enabled =
        typeof result.enabled === 'boolean' ? result.enabled : DEFAULT_SETTINGS.enabled
      const strict =
        typeof result.strictMatching === 'boolean'
          ? result.strictMatching
          : DEFAULT_SETTINGS.strictMatching
      const useCdn =
        typeof result.useCdn === 'boolean' ? result.useCdn : DEFAULT_SETTINGS.useCdn
      resolve({ language, enabled, strictMatching: strict, useCdn })
    })
  })
}

function updateDocumentLang(language: LanguageCode, enabled: boolean) {
  const langToSet = enabled && language !== 'off' ? language : initialDocumentLang
  document.documentElement?.setAttribute('lang', langToSet)
}

function buildLocaleUrls(code: Exclude<LanguageCode, 'off'>): Array<{ url: string; source: 'primary' | 'secondary' }> {
  return [
    { url: `${LOCALE_PRIMARY_BASE}/${code}.json`, source: 'primary' },
    { url: `${LOCALE_SECONDARY_BASE}/${code}.json`, source: 'secondary' }
  ]
}

async function fetchLocale(url: string): Promise<Dictionary> {
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`Failed to fetch locale: ${response.status}`)
  }

  const data = await response.json()
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid locale JSON')
  }
  return data as Dictionary
}

async function loadLocaleCacheFromStorage(): Promise<void> {
  if (cacheLoaded) return
  const storage = getCacheStorage()
  await new Promise<void>((resolve) => {
    storage.get({ [LOCALE_CACHE_KEY]: {} }, (result) => {
      const cached = (result as any)[LOCALE_CACHE_KEY] || {}
      const now = Date.now()
      Object.entries(cached as Record<string, CachedLocaleEntry>).forEach(([code, entry]) => {
        if (now - entry.fetchedAt < LOCALE_CACHE_TTL) {
          localeCache[code as Exclude<LanguageCode, 'off'>] = entry
        }
      })
      cacheLoaded = true
      resolve()
    })
  })
}

function persistLocaleCache() {
  try {
    getCacheStorage().set({ [LOCALE_CACHE_KEY]: localeCache })
  } catch (err) {
    console.warn('Could not persist locale cache', err)
  }
}

function getCachedLocale(
  code: Exclude<LanguageCode, 'off'>
): CachedLocaleEntry | null {
  const entry = localeCache[code]
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > LOCALE_CACHE_TTL) return null
  return entry
}

function cacheLocale(
  code: Exclude<LanguageCode, 'off'>,
  dictionary: Dictionary,
  source: 'primary' | 'secondary'
) {
  localeCache[code] = { dictionary, fetchedAt: Date.now(), source }
  persistLocaleCache()
}

async function fetchLocaleWithFallback(code: Exclude<LanguageCode, 'off'>): Promise<Dictionary | null> {
  const sources = buildLocaleUrls(code)
  for (let i = 0; i < sources.length; i += 1) {
    const { url, source } = sources[i]
    try {
      const locale = await fetchLocale(url)
      cacheLocale(code, locale, source)
      return locale
    } catch (err) {
      console.warn(`Could not fetch locale for ${code} from ${source}`, err)
    }
  }
  return null
}

async function primeLocalesFromCache() {
  await loadLocaleCacheFromStorage()
  Object.entries(localeCache).forEach(([code, entry]) => {
    loadedLanguages[code as Exclude<LanguageCode, 'off'>] = entry.dictionary
  })
}

async function refreshLocalesFromCdn() {
  if (!latestSettings.useCdn) return
  await loadLocaleCacheFromStorage()

  const updates: Partial<Record<Exclude<LanguageCode, 'off'>, Dictionary>> = {}
  const codes = Object.keys(BUNDLED_LANGUAGES) as Exclude<LanguageCode, 'off'>[]
  const now = Date.now()

  await Promise.all(
    codes.map(async (code) => {
      const cached = getCachedLocale(code)
      if (cached && now - cached.fetchedAt < LOCALE_CACHE_TTL) {
        updates[code] = cached.dictionary
        return
      }

      const locale = await fetchLocaleWithFallback(code)
      if (locale) {
        updates[code] = locale
      } else if (cached) {
        // Use stale cache as a soft fallback if network fails.
        updates[code] = cached.dictionary
      }
    })
  )

  if (Object.keys(updates).length) {
    loadedLanguages = { ...loadedLanguages, ...updates }
    applySettings(latestSettings)
  }
}

function applySettings(settings: Settings) {
  // 1. Revert existing translations if currently enabled.
  // Ensures a clean slate (English) before applying new language or disqualifying.
  if (isEnabled) {
    disconnectObserver()
    disconnectTitleObserver()
    revertWithin(document.body)
    revertPlaceholdersWithin(document.body)
    revertTitle()
  }

  // 2. Update state
  latestSettings = settings
  const language = settings.language === 'off' ? currentLanguage : settings.language

  // ensure we load dictionary if needed
  let dictionary: Dictionary | undefined

  if (settings.useCdn) {
    dictionary = loadedLanguages[language] ?? BUNDLED_LANGUAGES[language]
  } else {
    dictionary = BUNDLED_LANGUAGES[language]
  }

  // Fallback to default language if needed
  if (!dictionary) {
    if (settings.useCdn) {
      dictionary = loadedLanguages[DEFAULT_LANGUAGE]
    }
    // Final fallback
    if (!dictionary) {
      dictionary = BUNDLED_LANGUAGES[DEFAULT_LANGUAGE]
    }
  }

  currentLanguage = language
  isEnabled = settings.enabled && settings.language !== 'off'
  strictMatching = settings.strictMatching

  const built = buildReplacements(dictionary, strictMatching)
  activeReplacements = built.complex
  activeExactReplacements = built.exact

  const builtReverse = buildReverseReplacements(dictionary, strictMatching)
  reverseReplacements = builtReverse.complex
  reverseExactReplacements = builtReverse.exact

  // const activeCount = activeReplacements.length + activeExactReplacements.size
  // console.log(`[Webflow-Localization] Loaded ${activeCount} replacements (${activeExactReplacements.size} exact, ${activeReplacements.length} complex)`)
  updateDocumentLang(currentLanguage, isEnabled)

  // 3. Apply new translations if enabled
  if (isEnabled) {
    translateWithin(document.body)
    translatePlaceholdersWithin(document.body)
    translateTitle()
    observeDocument()
    observeTitle()
  }

  // Update footer regardless of enabled state (to show English when disabled)
  // We pass a callback to allow the footer dropdown to trigger immediate updates manually
  injectDashboardFooter(currentLanguage, isEnabled, (updates) => {
    applySettings({ ...latestSettings, ...updates })
  })
}

function listenForSettingsChanges() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' && areaName !== 'local') return
    if (
      !changes.language &&
      typeof changes.enabled === 'undefined' &&
      typeof changes.strictMatching === 'undefined'
    )
      return

    const language = (changes.language?.newValue as LanguageCode) ?? currentLanguage
    const enabled =
      typeof changes.enabled?.newValue === 'boolean' ? changes.enabled.newValue : isEnabled
    const strict =
      typeof changes.strictMatching?.newValue === 'boolean'
        ? changes.strictMatching.newValue
        : strictMatching
    const useCdn =
      typeof changes.useCdn?.newValue === 'boolean'
        ? changes.useCdn.newValue
        : latestSettings.useCdn

    applySettings({ language, enabled, strictMatching: strict, useCdn })
  })
}

function init() {
  if (!document.body) return
  getSavedSettings()
    .then(async (settings) => {
      await primeLocalesFromCache()
      applySettings(settings)
      listenForSettingsChanges()
      refreshLocalesFromCdn()
    })
    .catch((err) => {
      console.warn('Failed to load saved settings', err)
      refreshLocalesFromCdn()
    })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
