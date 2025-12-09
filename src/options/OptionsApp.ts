type LanguageCode = 'ja' | 'zh-TW'

type Settings = { language: LanguageCode; enabled: boolean; strictMatching: boolean }

const DEFAULT_LANGUAGE: LanguageCode = 'ja'
const DEFAULT_SETTINGS: Settings = { language: DEFAULT_LANGUAGE, enabled: true, strictMatching: true }

const languages: Array<{ value: LanguageCode; label: string; nativeLabel: string }> =
  [
    { value: 'ja', label: 'Japanese', nativeLabel: '日本語' },
    { value: 'zh-TW', label: 'Traditional Chinese', nativeLabel: '繁體中文' }
  ]

function getStorage(): chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea {
  if (chrome?.storage?.sync) return chrome.storage.sync
  return chrome.storage.local
}

function renderToggle(
  root: HTMLElement,
  options: { name?: string; title?: string; description?: string } = {}
) {
  const toggle = document.createElement('label')
  toggle.className = 'toggle'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.name = options.name ?? 'enabled'

  const track = document.createElement('span')
  track.className = 'toggle_track'

  const thumb = document.createElement('span')
  thumb.className = 'toggle_thumb'

  const text = document.createElement('div')
  text.className = 'toggle_text'
  text.innerHTML = `<strong>${options.title ?? 'Enable translation'}</strong><span>${options.description ?? 'Turn this off to keep Webflow in English.'
    }</span>`

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

  root.appendChild(form)

  return form
}

function setStatus(element: HTMLElement, message: string) {
  element.textContent = message
  element.dataset.status = 'changed'
  setTimeout(() => {
    element.textContent = 'Choose the language you want to see in Webflow. More languages coming soon!'
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

function hydrateSelection(
  form: HTMLFormElement,
  enabledToggle: HTMLInputElement,
  strictToggle: HTMLInputElement,
  status: HTMLElement
) {
  const storage = getStorage()
  storage.get(DEFAULT_SETTINGS, (result) => {
    const language = (result.language as LanguageCode) ?? DEFAULT_LANGUAGE
    const enabled =
      typeof result.enabled === 'boolean' ? result.enabled : DEFAULT_SETTINGS.enabled
    const strictMatching =
      typeof result.strictMatching === 'boolean'
        ? result.strictMatching
        : DEFAULT_SETTINGS.strictMatching

    const input = form.querySelector<HTMLInputElement>(`input[value="${language}"]`)
    if (input) {
      input.checked = true
    }

    enabledToggle.checked = enabled
    strictToggle.checked = strictMatching
    toggleLanguageDisabled(form, !enabled)

    enabledToggle.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      const nextEnabled = Boolean(target.checked)
      toggleLanguageDisabled(form, !nextEnabled)
      storage.set({ enabled: nextEnabled }, () =>
        setStatus(status, nextEnabled ? 'Translation enabled' : 'Translation turned off')
      )
    })

    strictToggle.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      const nextStrict = Boolean(target.checked)
      storage.set({ strictMatching: nextStrict }, () =>
        setStatus(
          status,
          nextStrict
            ? 'Partial translations avoided'
            : 'Partial translations allowed (sub-phrases will change)'
        )
      )
    })

    form.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      if (!target || target.name !== 'language') return

      const nextLanguage = target.value as LanguageCode
      storage.set({ language: nextLanguage, enabled: true }, () =>
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
        <h1 class="title">Choose your Webflow UI language</h1>
        <p class="lede">
          This extension translates the UI of Webflow&rsquo;s Dashboard and Designer. The goal is to make Webflow easier to use without distorting its terminology. It may not translate every term.
        </p>
        <p class="lede translation">
          この拡張機能は Webflow の ダッシュボード と Designer の UI を翻訳します。用語を歪めないようにするため、すべての文言は訳されない場合があります。
        </p>
        <p class="lede translation">
          此擴充功能會翻譯 Webflow 的 Dashboard 與 Designer 介面。為了避免混淆 Webflow 的術語，可能不會翻譯所有文字。
        </p>
      </div>
    </div>
  `

  const container = document.createElement('div')
  container.className = 'options_card'
  root.querySelector('.options_shell')?.appendChild(container)

  const enabledToggle = renderToggle(container)

  const status = document.createElement('p')
  status.className = 'status'
  status.setAttribute('data-status', 'idle')
  status.textContent = 'Choose the language you want to see in Webflow. More languages later!'
  container.appendChild(status)

  const form = renderLanguages(container)
  const strictToggle = renderToggle(container, {
    name: 'strictMatching',
    title: 'Avoid partial translations (Recommended)',
    description:
      'Only translate when the full text matches the dictionary entry. Prevents partial phrase changes.'
  })
  const footer = document.createElement('div')
  footer.className = 'footer'
  const divider = document.createElement('div')
  divider.className = 'footer_divider'

  const meta = document.createElement('div')
  meta.className = 'footer_meta'

  const credit = document.createElement('p')
  credit.className = 'credit'
  credit.innerHTML = `Made with &hearts; by <a href="https://x.com/anthonycxc" target="_blank" rel="noreferrer">Anthony C.</a>`

  const repoLink = document.createElement('a')
  repoLink.className = 'repo_link'
  repoLink.href = 'https://github.com/SPACESODA/Webflow-UI-Localization'
  repoLink.target = '_blank'
  repoLink.rel = 'noreferrer'
  repoLink.textContent = 'Contribute on GitHub'

  meta.appendChild(credit)
  meta.appendChild(repoLink)

  const disclaimer = document.createElement('p')
  disclaimer.className = 'disclaimer'
  disclaimer.textContent =
    'This extension is an independent project and is not affiliated with or endorsed by Webflow. Webflow is a trademark of Webflow, Inc.'

  hydrateSelection(form, enabledToggle, strictToggle, status)
  footer.appendChild(divider)
  footer.appendChild(meta)
  footer.appendChild(disclaimer)
  container.appendChild(footer)
}

initOptionsPage()
