type LanguageCode = 'ja' | 'zh-TW'

type Settings = {language: LanguageCode; enabled: boolean}

const DEFAULT_LANGUAGE: LanguageCode = 'ja'
const DEFAULT_SETTINGS: Settings = {language: DEFAULT_LANGUAGE, enabled: true}

const languages: Array<{value: LanguageCode; label: string; nativeLabel: string}> =
  [
    {value: 'ja', label: 'Japanese', nativeLabel: '日本語'},
    {value: 'zh-TW', label: 'Traditional Chinese', nativeLabel: '繁體中文'}
  ]

function getStorage(): chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea {
  if (chrome?.storage?.sync) return chrome.storage.sync
  return chrome.storage.local
}

function renderToggle(root: HTMLElement) {
  const toggle = document.createElement('label')
  toggle.className = 'toggle'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.name = 'enabled'

  const track = document.createElement('span')
  track.className = 'toggle_track'

  const thumb = document.createElement('span')
  thumb.className = 'toggle_thumb'

  const text = document.createElement('div')
  text.className = 'toggle_text'
  text.innerHTML = `<strong>Enable translation</strong><span>Turn this off to keep Webflow in English.</span>`

  track.appendChild(thumb)
  toggle.appendChild(checkbox)
  toggle.appendChild(track)
  toggle.appendChild(text)

  root.appendChild(toggle)

  return checkbox
}

function renderLanguages(root: HTMLElement) {
  const form = document.createElement('form')
  form.id = 'language-form'

  languages.forEach((language) => {
    const wrapper = document.createElement('label')
    wrapper.className = 'language_option'

    const radio = document.createElement('input')
    radio.type = 'radio'
    radio.name = 'language'
    radio.value = language.value

    const name = document.createElement('span')
    name.className = 'language_name'
    name.textContent = language.label

    const nativeName = document.createElement('span')
    nativeName.className = 'language_native'
    nativeName.textContent = language.nativeLabel

    wrapper.appendChild(radio)
    wrapper.appendChild(name)
    wrapper.appendChild(nativeName)
    form.appendChild(wrapper)
  })

  const status = document.createElement('p')
  status.className = 'status'
  status.setAttribute('data-status', 'idle')
  status.textContent = 'Choose the language you want to see in Webflow.'

  root.appendChild(form)
  root.appendChild(status)

  return {form, status}
}

function setStatus(element: HTMLElement, message: string) {
  element.textContent = message
  element.dataset.status = 'changed'
  setTimeout(() => {
    element.textContent = 'Choose the language you want to see in Webflow.'
    element.dataset.status = 'idle'
  }, 2000)
}

function toggleLanguageDisabled(form: HTMLFormElement, disabled: boolean) {
  const inputs = form.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  inputs.forEach((input) => {
    input.disabled = disabled
  })
  if (disabled) {
    form.setAttribute('data-disabled', 'true')
  } else {
    form.removeAttribute('data-disabled')
  }
}

function hydrateSelection(form: HTMLFormElement, enabledToggle: HTMLInputElement, status: HTMLElement) {
  const storage = getStorage()
  storage.get(DEFAULT_SETTINGS, (result) => {
    const language = (result.language as LanguageCode) ?? DEFAULT_LANGUAGE
    const enabled =
      typeof result.enabled === 'boolean' ? result.enabled : DEFAULT_SETTINGS.enabled

    const input = form.querySelector<HTMLInputElement>(`input[value="${language}"]`)
    if (input) {
      input.checked = true
    }

    enabledToggle.checked = enabled
    toggleLanguageDisabled(form, !enabled)

    enabledToggle.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      const nextEnabled = Boolean(target.checked)
      toggleLanguageDisabled(form, !nextEnabled)
      storage.set({enabled: nextEnabled}, () =>
        setStatus(status, nextEnabled ? 'Translation enabled' : 'Translation turned off')
      )
    })

    form.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      if (!target || target.name !== 'language') return

      const nextLanguage = target.value as LanguageCode
      storage.set({language: nextLanguage, enabled: true}, () =>
        setStatus(status, 'Saved')
      )
      enabledToggle.checked = true
      toggleLanguageDisabled(form, false)
    })
  })
}

export default function initOptionsPage() {
  const root = document.getElementById('root')
  if (!root) return

  root.innerHTML = `
    <div class="options_shell">
      <div>
        <p class="eyebrow">Webflow UI Localization</p>
        <h1 class="title">Choose your language</h1>
        <p class="lede">
          Switch Webflow&rsquo;s dashboard labels between Japanese and Traditional Chinese, or turn translations off to use English.
        </p>
      </div>
    </div>
  `

  const container = document.createElement('div')
  container.className = 'options_card'
  root.querySelector('.options_shell')?.appendChild(container)

  const enabledToggle = renderToggle(container)
  const {form, status} = renderLanguages(container)
  hydrateSelection(form, enabledToggle, status)
}

initOptionsPage()
