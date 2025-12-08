import ja from '../locales/ja.json'
import zhTw from '../locales/zh-TW.json'

type LanguageCode = 'ja' | 'zh-TW' | 'off'

type Dictionary = Record<string, string>

type Replacement = {regex: RegExp; replacement: string; marker?: string}

type Settings = {language: LanguageCode; enabled: boolean}

const SUPPORTED_LANGUAGES: Record<Exclude<LanguageCode, 'off'>, Dictionary> = {
  ja,
  'zh-TW': zhTw
}

const DEFAULT_LANGUAGE: Exclude<LanguageCode, 'off'> = 'ja'
const DEFAULT_SETTINGS: Settings = {language: DEFAULT_LANGUAGE, enabled: true}

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
let observer: MutationObserver | null = null
let flushScheduled = false
const pendingTextNodes = new Set<Text>()
const pendingElements = new Set<Element>()

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildReplacements(dictionary: Dictionary): Replacement[] {
  return Object.entries(dictionary).map(([source, replacement]) => ({
    regex: new RegExp(escapeRegExp(source), 'g'),
    replacement,
    marker: source.slice(0, 6) // quick marker to short-circuit text without a likely match
  }))
}

function buildReverseReplacements(dictionary: Dictionary): Replacement[] {
  return Object.entries(dictionary).map(([source, replacement]) => ({
    regex: new RegExp(escapeRegExp(replacement), 'g'),
    replacement: source,
    marker: replacement.slice(0, 6)
  }))
}

function maybeContains(text: string, marker?: string) {
  if (!marker) return true
  return text.includes(marker)
}

function translateTextNode(node: Text) {
  const raw = node.data
  if (!raw.trim() || !activeReplacements.length || !isEnabled) return

  let updated = raw
  let changed = false

  for (let i = 0; i < activeReplacements.length; i += 1) {
    const {regex, replacement, marker} = activeReplacements[i]
    if (!maybeContains(updated, marker)) continue
    const next = updated.replace(regex, replacement)
    if (next !== updated) {
      updated = next
      changed = true
    }
  }

  if (changed) {
    node.data = updated
  }
}

function revertTextNode(node: Text) {
  const raw = node.data
  if (!raw.trim() || !reverseReplacements.length || isEnabled) return

  let updated = raw
  let changed = false

  for (let i = 0; i < reverseReplacements.length; i += 1) {
    const {regex, replacement, marker} = reverseReplacements[i]
    if (!maybeContains(updated, marker)) continue
    const next = updated.replace(regex, replacement)
    if (next !== updated) {
      updated = next
      changed = true
    }
  }

  if (changed) {
    node.data = updated
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
      return shouldSkipTextNode(textNode) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
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
      return shouldSkipTextNode(textNode) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
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
}

function scheduleFlush() {
  if (flushScheduled) return
  flushScheduled = true

  const runner = () => {
    flushPending()
  }

  if ('requestIdleCallback' in window) {
    // @ts-ignore
    window.requestIdleCallback(runner, {timeout: 100})
  } else {
    setTimeout(runner, 16)
  }
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
      resolve({language, enabled})
    })
  })
}

function applySettings(settings: Settings) {
  const language = settings.language === 'off' ? currentLanguage : settings.language
  const dictionary = SUPPORTED_LANGUAGES[language] ?? SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE]

  currentLanguage = language
  isEnabled = settings.enabled && settings.language !== 'off'
  activeReplacements = buildReplacements(dictionary)
  reverseReplacements = buildReverseReplacements(dictionary)

  if (isEnabled) {
    translateWithin(document.body)
    observeDocument()
  } else {
    revertWithin(document.body)
    disconnectObserver()
  }
}

function listenForSettingsChanges() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' && areaName !== 'local') return
    if (!changes.language && typeof changes.enabled === 'undefined') return

    const language = (changes.language?.newValue as LanguageCode) ?? currentLanguage
    const enabled =
      typeof changes.enabled?.newValue === 'boolean' ? changes.enabled.newValue : isEnabled

    applySettings({language, enabled})
  })
}

function init() {
  if (!document.body) return
  getSavedSettings().then((settings) => {
    applySettings(settings)
    listenForSettingsChanges()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
