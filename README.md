[powered-image]: https://img.shields.io/badge/Powered%20by-Extension.js-0971fe
[powered-url]: https://extension.js.org

# Webflow UI Localization

> It is a browser extension that allows you to translate the UI of Webflow Dashboard and Designer into your language.

The extension swaps UI strings on these Webflow surfaces:

- `https://webflow.com/dashboard*`
- `https://preview.webflow.com*`
- `https://*.design.webflow.com*`

Open the extension’s Options page (click the extension icon) to choose your language or turn translations off to stay in English. You can also click the toolbar extension icon to toggle translations (badge shows OFF when disabled).

### Contribute translations

Join the community translation project on POEditor 🦜

It's easy to contribute!  
https://poeditor.com/join/project/7drFUDh3dh

Latest locale JSONs via jsDelivr:  
https://www.jsdelivr.com/package/gh/SPACESODA/Webflow-UI-Localization

<br />

Made with &hearts; by [Anthony C.](https://x.com/anthonycxc)

<br />

---

<br />
<br />

![Powered by Extension.js][powered-image]

## Installation

```bash
npx extension@latest create <project-name> --template typescript
cd <project-name>
npm install
```

## Commands

### dev

Run the extension in development mode.

```bash
npm run dev
```

### build

Build the extension for production.

```bash
npm run build
```

### preview

Preview the extension in the browser.

```bash
npm run preview
```

## Browser targets

Chromium is the default. You can explicitly target Chrome, Edge, or Firefox:

```bash
# Chromium (default)
npm run dev

# Chrome
npm run dev -- --browser=chrome

# Edge
npm run dev -- --browser=edge

# Firefox (not tested yet)
npm run dev -- --browser=firefox
```
