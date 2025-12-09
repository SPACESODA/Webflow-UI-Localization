const DEFAULT_SETTINGS = {enabled: true}

function getStorage(): chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea {
  if (chrome?.storage?.sync) return chrome.storage.sync
  return chrome.storage.local
}

function setBadge(enabled: boolean) {
  chrome.action.setBadgeText({text: enabled ? '' : 'OFF'})
  chrome.action.setBadgeBackgroundColor({color: '#ef4444'})
}

function refreshBadge() {
  const storage = getStorage()
  storage.get(DEFAULT_SETTINGS, (result) => {
    const enabled = typeof result.enabled === 'boolean' ? result.enabled : true
    setBadge(enabled)
  })
}

function toggleEnabled() {
  const storage = getStorage()
  storage.get(DEFAULT_SETTINGS, (result) => {
    const next = !(typeof result.enabled === 'boolean' ? result.enabled : true)
    storage.set({enabled: next}, () => setBadge(next))
  })
}

chrome.action.onClicked.addListener(() => {
  toggleEnabled()
})

chrome.runtime.onInstalled.addListener(() => {
  refreshBadge()
})

chrome.runtime.onStartup.addListener(() => {
  refreshBadge()
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' && areaName !== 'local') return
  if (typeof changes.enabled?.newValue === 'boolean') {
    setBadge(Boolean(changes.enabled.newValue))
  }
})
