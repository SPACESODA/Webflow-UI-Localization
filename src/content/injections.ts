import type { LanguageCode, Dictionary } from '../types'
import extJa from '../locales-extension/ja.json'
import extZhTw from '../locales-extension/zh-TW.json'
import extZhCn from '../locales-extension/zh-CN.json'
import extKo from '../locales-extension/ko.json'

const EXTENSION_LOCALES: Record<Exclude<LanguageCode, 'off'>, Dictionary> = {
    ja: extJa,
    'zh-TW': extZhTw,
    'zh-CN': extZhCn,
    ko: extKo
}

type SettingsUpdate = { language?: LanguageCode; enabled?: boolean }

// State for delay
let isReady = false
let pendingArgs: { currentLanguage: Exclude<LanguageCode, 'off'>, isEnabled: boolean, onUpdate?: (settings: SettingsUpdate) => void } | null = null

// Initialize 2s delay
setTimeout(() => {
    isReady = true
    if (pendingArgs) {
        injectDashboardFooter(pendingArgs.currentLanguage, pendingArgs.isEnabled, pendingArgs.onUpdate)
        pendingArgs = null
    }
}, 2000)

export function injectDashboardFooter(
    currentLanguage: Exclude<LanguageCode, 'off'>,
    isEnabled: boolean,
    onUpdate?: (settings: SettingsUpdate) => void
) {
    // Always store latest args
    pendingArgs = { currentLanguage, isEnabled, onUpdate }

    // If not ready, just return (it will be called when timeout fires)
    if (!isReady) return

    // We use window.location for stricter parsing (Hostname vs Path vs Query)
    const { hostname, pathname } = window.location

    // Designer: strictly "preview.webflow.com" OR a subdomain of ".design.webflow.com"
    const isDesigner = hostname === 'preview.webflow.com' || hostname.endsWith('.design.webflow.com')

    // Dashboard/Auth: strictly "webflow.com" domain (with specific paths)
    const isWebflowCom = hostname === 'webflow.com'
    const isDashboardOrAuth = isWebflowCom && (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/forgot')
    )

    if (isDesigner) {
        injectDesignerFooter(currentLanguage, isEnabled, onUpdate)
    } else if (isDashboardOrAuth) {
        injectSimpleFooter(currentLanguage, isEnabled)
    }
}

function injectDesignerFooter(
    currentLanguage: Exclude<LanguageCode, 'off'>,
    isEnabled: boolean,
    onUpdate?: (settings: SettingsUpdate) => void
) {
    // Target: Specific settings pane
    let target = document.querySelector('div[data-dsi-area="siteSettings"] .bem-Pane_Body_Inner')

    // Fallback to main left nav if the detailed pane isn't found (for broader compatibility)
    if (!target) {
        target = document.querySelector('nav[data-sc="LeftNavView VStack Stack View"]')
    }

    if (!target) return

    const footerId = 'webflow-ui-localization-footer'
    let footer = document.getElementById(footerId)

    // Check availability and location
    if (footer && footer.dataset.type === 'designer' && footer.parentElement === target) {
        if (target.lastElementChild !== footer) target.appendChild(footer)
        // Update selection state if needed (though interaction handling usually covers this)
        // To be safe, we re-render if fundamental state changed externally
        if (footer.dataset.lang !== currentLanguage || footer.dataset.enabled !== String(isEnabled)) {
            // Re-render
        } else {
            return
        }
    }

    if (!footer) {
        footer = document.createElement('div')
        footer.id = footerId
        footer.dataset.type = 'designer'
        footer.className = 'wul-footer wul-footer--designer'
        target.appendChild(footer)
    } else {
        // Ensure footer is always at the bottom.
        // If Webflow's UI added new elements (like a popped-up menu), we move our footer to the end to maintain order.
        if (footer.parentElement !== target) target.appendChild(footer)
        else if (target.lastElementChild !== footer) target.appendChild(footer)
    }

    const { msg, opt, join, madeByText } = getLocalizedStrings(currentLanguage, isEnabled)

    // Determine value for select
    const selectValue = isEnabled ? currentLanguage : 'off'

    footer.innerHTML = `
    <div class="wul-select-wrapper">
        <select id="wul-language-select" class="wul-select">
            <option value="off">English</option>
            <option value="ja">日本語 (Japanese)</option>
            <option value="zh-TW">繁體中文 (Traditional Chinese)</option>
            <option value="zh-CN">简体中文 (Simplified Chinese)</option>
            <option value="ko">한국어 (Korean)</option>
        </select>
    </div>
    <div class="wul-message">${msg}</div>
    <div class="wul-links">
       <a href="#" id="wul-options" class="wul-link">${opt}</a>
       <a href="https://poeditor.com/join/project/7drFUDh3dh" target="_blank" class="wul-link">${join}</a>
    </div>
    <div class="wul-meta">
      <a href="https://x.com/anthonycxc" target="_blank" class="wul-link">${madeByText}</a>
    </div>
    `
    footer.dataset.lang = currentLanguage
    footer.dataset.enabled = String(isEnabled)

    // Set Select Value
    const select = footer.querySelector('#wul-language-select') as HTMLSelectElement
    if (select) {
        select.value = selectValue
        select.addEventListener('change', (e) => {
            const val = (e.target as HTMLSelectElement).value

            const storage = chrome.storage.sync || chrome.storage.local

            let update: SettingsUpdate = {}
            if (val === 'off') {
                update = { enabled: false }
            } else {
                update = { enabled: true, language: val as LanguageCode }
            }

            storage.set(update)
            onUpdate?.(update)
        })
    }

    bindOptionsLink(footer)
}

function injectSimpleFooter(currentLanguage: Exclude<LanguageCode, 'off'>, isEnabled: boolean) {
    const target = document.querySelector('nav[data-sc="LeftNavView VStack Stack View"]')
    if (!target) return

    const footerId = 'webflow-ui-localization-footer'
    let footer = document.getElementById(footerId)

    if (footer && footer.dataset.type === 'simple' && footer.parentElement === target) {
        if (target.lastElementChild !== footer) target.appendChild(footer)
        if (footer.dataset.lang === currentLanguage && footer.dataset.enabled === String(isEnabled)) return
    }

    if (!footer) {
        footer = document.createElement('div')
        footer.id = footerId
        footer.dataset.type = 'simple'
        footer.className = 'wul-footer wul-footer--simple'
        target.appendChild(footer)
    } else {
        // Move if needed
        if (footer.parentElement !== target) target.appendChild(footer)
        else if (target.lastElementChild !== footer) target.appendChild(footer)
    }

    const { msg, opt, join, madeByText } = getLocalizedStrings(currentLanguage, isEnabled)

    footer.innerHTML = `
    <div class="wul-message">${msg}</div>
    <div class="wul-links">
       <a href="#" id="wul-options" class="wul-link">${opt}</a>
       <a href="https://poeditor.com/join/project/7drFUDh3dh" target="_blank" class="wul-link">${join}</a>
    </div>
    <div class="wul-meta">
      <a href="https://x.com/anthonycxc" target="_blank" class="wul-link">${madeByText}</a>
    </div>
    `
    footer.dataset.lang = currentLanguage
    footer.dataset.enabled = String(isEnabled)

    bindOptionsLink(footer)
}

function getLocalizedStrings(currentLanguage: Exclude<LanguageCode, 'off'>, isEnabled: boolean) {
    const defaultMsg = 'Click the Webflow UI Localization browser extension icon to enable / disable translations at any time.'
    const defaultOpt = 'Options'
    const defaultJoin = 'Join translations?'
    const madeByText = 'Made with ♥ by Anthony C.'

    const getString = (key: string, fallback: string) => {
        if (!isEnabled) return fallback
        const dictionary = EXTENSION_LOCALES[currentLanguage]
        return dictionary?.[key] || fallback
    }

    return {
        msg: getString('footer_message', defaultMsg),
        opt: getString('footer_options', defaultOpt),
        join: getString('footer_join', defaultJoin),
        madeByText
    }
}

function bindOptionsLink(footer: HTMLElement) {
    const optionsLink = footer.querySelector('#wul-options') as HTMLAnchorElement
    if (optionsLink) {
        optionsLink.onclick = (e) => {
            e.preventDefault()
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({ action: 'openOptionsPage' })
            } else {
                alert('Please reload the page to use this feature.')
            }
        }
    }
}
