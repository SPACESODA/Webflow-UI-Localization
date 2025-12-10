import ja from '../locales/ja.json'
import zhTw from '../locales/zh-TW.json'
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
  'zh-TW': zhTw
}

const REMOTE_LOCALE_URLS: Partial<Record<Exclude<LanguageCode, 'off'>, string>> = {
  ja: 'https://cdn.jsdelivr.net/gh/SPACESODA/Webflow-UI-Localization@latest/src/locales/ja.json',
  'zh-TW':
    'https://cdn.jsdelivr.net/gh/SPACESODA/Webflow-UI-Localization@latest/src/locales/zh-TW.json'
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
  'OPTION',
  'BUTTON'
])

let activeReplacements: Replacement[] = []
let reverseReplacements: Replacement[] = []
let currentLanguage: Exclude<LanguageCode, 'off'> = DEFAULT_LANGUAGE
let isEnabled = true
let strictMatching = true
let latestSettings: Settings = DEFAULT_SETTINGS
let loadedLanguages: Record<Exclude<LanguageCode, 'off'>, Dictionary> = { ...BUNDLED_LANGUAGES }
let observer: MutationObserver | null = null
let flushScheduled = false
const pendingTextNodes = new Set<Text>()
const pendingElements = new Set<Element>()

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

function buildTokenizedReplacement(
  sourceString: string,
  targetString: string,
  flexible: boolean
): Replacement {
  // 1. Identify tokens in source: {name}, {count}, {*}, etc.
  const tokenRegex = /\{[^}]+\}/g
  const sourceTokens: string[] = sourceString.match(tokenRegex) || []

  // 2. Build Regex Pattern
  // Split source by tokens to get static parts
  const parts = sourceString.split(tokenRegex)

  const toPattern = flexible ? buildFlexiblePattern : escapeRegExp

  let patternString = '^(\\s*)'

  parts.forEach((part, index) => {
    if (part) {
      patternString += toPattern(part)
    }
    if (index < parts.length - 1) {
      patternString += '([\\s\\S]*?)' // Capture content for the token
    }
  })

  patternString += '(\\s*)$'
  const regex = new RegExp(patternString)

  // 3. Build Replacement Function
  const replacement = (_match: string, ...args: any[]) => {
    // args: [leading, t1, t2, ..., tN, trailing, offset, string]
    // leading = args[0]
    // trailing = args[sourceTokens.length + 1]

    const leading = args[0]
    const trailing = args[sourceTokens.length + 1]

    // Map token names to captured values
    // Using a pool to handle repeated tokens like {*}
    const valuePool: Record<string, string[]> = {}
    sourceTokens.forEach((tokenName, i) => {
      if (!valuePool[tokenName]) valuePool[tokenName] = []
      valuePool[tokenName].push(args[i + 1])
    })

    // Construct result by replacing tokens in targetString
    // We clone the pool so we can shift values out
    const currentPool = { ...valuePool }
    // Shallow copy of arrays inside
    for (const k in currentPool) {
      currentPool[k] = [...currentPool[k]]
    }

    const result = targetString.replace(tokenRegex, (token) => {
      if (currentPool[token] && currentPool[token].length > 0) {
        return currentPool[token].shift()!
      }
      return token // Leave as is if no value captured?
    })

    return `${leading}${result}${trailing}`
  }

  return { regex, replacement }
}

function buildReplacements(dictionary: Dictionary, strict: boolean): Replacement[] {
  const entries = Object.entries(dictionary).sort(([a], [b]) => b.length - a.length)

  if (strict) {
    return entries.map(([source, replacement]) =>
      buildTokenizedReplacement(source, replacement, FLEXIBLE_STRICT_WHITESPACE)
    )
  }

  return entries.map(([source, replacement]) => ({
    regex: new RegExp(escapeRegExp(source), 'g'),
    replacement,
    marker: source.slice(0, 6)
  }))
}

function buildReverseReplacements(dictionary: Dictionary, strict: boolean): Replacement[] {
  const entries = Object.entries(dictionary).sort(([a], [b]) => b.length - a.length)

  if (strict) {
    return entries.map(([source, replacement]) =>
      buildTokenizedReplacement(replacement, source, FLEXIBLE_STRICT_WHITESPACE)
    )
  }

  return entries.map(([source, replacement]) => ({
    regex: new RegExp(escapeRegExp(replacement), 'g'),
    replacement: source,
    marker: replacement.slice(0, 6)
  }))
}

function maybeContains(text: string, marker?: string) {
  if (!marker) return true
  return text.includes(marker)
}

function applyReplacements(text: string, replacements: Replacement[]): { updated: string; changed: boolean } {
  if (!text.trim() || !replacements.length) return { updated: text, changed: false }

  let updated = text
  let changed = false

  for (let i = 0; i < replacements.length; i += 1) {
    const { regex, replacement, marker } = replacements[i]
    if (!maybeContains(updated, marker)) continue
    const next = updated.replace(regex, replacement as any)
    if (next !== updated) {
      updated = next
      changed = true
    }
  }

  return { updated, changed }
}

function translateTextNode(node: Text) {
  if (!isEnabled) return
  const { updated, changed } = applyReplacements(node.data, activeReplacements)
  if (changed) {
    node.data = updated
  }
}

function revertTextNode(node: Text) {
  // If enabled, we don't revert. Revert is only called when disabling or switching languages.
  // Actually the logic was "if isEnabled return".
  if (isEnabled) return

  const { updated, changed } = applyReplacements(node.data, reverseReplacements)
  if (changed) {
    node.data = updated
  }
}

let originalTitle = ''
let titleObserver: MutationObserver | null = null

function translateTitle() {
  if (!isEnabled) return

  const current = document.title
  const { updated, changed } = applyReplacements(current, activeReplacements)

  if (changed && updated !== current) {
    document.title = updated
  }
}

function revertTitle() {
  if (isEnabled) return
  const current = document.title
  const { updated, changed } = applyReplacements(current, reverseReplacements)
  if (changed) {
    document.title = updated
  }
}

function observeTitle() {
  if (titleObserver) titleObserver.disconnect()

  const titleEl = document.querySelector('title')
  if (!titleEl) return // Should observe head if title doesn't exist yet? Webflow usually has it.

  titleObserver = new MutationObserver(() => {
    // When title changes (by app or by us)
    // If by us, we probably shouldn't react?
    // But the app might overwrite our translation with English.
    // So we need to re-apply translation.
    // To avoid loop: check if translation needed.
    if (isEnabled) {
      translateTitle()
    }
  })

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

function flushPending() {
  flushScheduled = false
  if (!document.body) return

  if (isEnabled) {
    pendingTextNodes.forEach((text) => translateTextNode(text))
    pendingElements.forEach((element) => translateWithin(element))
  } else {
    pendingTextNodes.forEach((text) => revertTextNode(text))
    pendingElements.forEach((element) => revertWithin(element))
  }

  pendingTextNodes.clear()
  pendingElements.clear()
  injectDashboardFooter(currentLanguage, isEnabled)
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

function observeDocument() {
  if (observer) observer.disconnect()
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        if (mutation.target.nodeType === Node.TEXT_NODE) {
          pendingTextNodes.add(mutation.target as Text)
        }
      }

      mutation.addedNodes.forEach((node) => {
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
  })

  observer.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true
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

async function refreshLocalesFromCdn() {
  if (!latestSettings.useCdn) return

  const updates: Partial<Record<Exclude<LanguageCode, 'off'>, Dictionary>> = {}
  const entries = Object.entries(REMOTE_LOCALE_URLS) as [Exclude<LanguageCode, 'off'>, string][]

  await Promise.all(
    entries.map(async ([code, url]) => {
      try {
        const locale = await fetchLocale(url)
        updates[code] = locale
      } catch (err) {
        console.warn(`Could not refresh locale for ${code}`, err)
      }
    })
  )

  if (Object.keys(updates).length) {
    loadedLanguages = { ...loadedLanguages, ...updates }
    applySettings(latestSettings)
  }
}

function applySettings(settings: Settings) {
  latestSettings = settings
  const language = settings.language === 'off' ? currentLanguage : settings.language
  const dictionary =
    loadedLanguages[language] ??
    BUNDLED_LANGUAGES[language] ??
    loadedLanguages[DEFAULT_LANGUAGE] ??
    BUNDLED_LANGUAGES[DEFAULT_LANGUAGE]

  currentLanguage = language
  isEnabled = settings.enabled && settings.language !== 'off'
  strictMatching = settings.strictMatching
  activeReplacements = buildReplacements(dictionary, strictMatching)
  reverseReplacements = buildReverseReplacements(dictionary, strictMatching)
  updateDocumentLang(currentLanguage, isEnabled)

  if (isEnabled) {
    translateWithin(document.body)
    translateTitle()
    observeDocument()
    observeTitle()
  } else {
    revertWithin(document.body)
    revertTitle()
    disconnectObserver()
    disconnectTitleObserver()
  }

  // Update footer regardless of enabled state (to show English when disabled)
  injectDashboardFooter(currentLanguage, isEnabled)

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
    .then((settings) => {
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
