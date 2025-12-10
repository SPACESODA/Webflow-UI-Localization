[powered-image]: https://img.shields.io/badge/Powered%20by-Extension.js-0971fe
[powered-url]: https://extension.js.org

# Webflow UI Localization

> An open-source browser extension that allows you to translate the UI of Webflow Dashboard and Designer into your language.

The extension currently swaps UI strings on the following Webflow surfaces:

- `https://webflow.com/dashboard*`
- `https://webflow.com/login*`
- `https://webflow.com/signup*`
- `https://preview.webflow.com*`
- `https://*.design.webflow.com*`

Open the extension’s Options page (by right-clicking the extension icon) to select your language. You can also click the toolbar icon to toggle translations at any time — the badge will show OFF when translations are disabled.

The plan is to support Japanese, Traditional Chinese, Simplified Chinese, and Korean first, with more languages to be added over time.

### Contribute translations

**Join the community translation project on POEditor 🦜**

It's easy to contribute!  
https://poeditor.com/join/project/7drFUDh3dh

Latest locale JSONs via jsDelivr:  
[https://www.jsdelivr.com/package/gh/SPACESODA/Webflow-UI-Localization](https://www.jsdelivr.com/package/gh/SPACESODA/Webflow-UI-Localization?tab=files&path=src%2Flocales)

<br />

Made with &hearts; by [Anthony C.](https://x.com/anthonycxc)

---
This extension is an independent project and is not affiliated with or endorsed by Webflow. Webflow is a trademark of Webflow, Inc.

<br />
<br />
<br />

[![Powered by Extension.js][powered-image]][powered-url]

<br />

---

<br />
<br />

## Load the extension (unpacked)

1) Install deps and build: `npm install && npm run build`
2) Open `chrome://extensions` (Edge: `edge://extensions`), enable Developer Mode.
3) Click “Load unpacked” and select the `dist` folder in this repo.

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
