<p align="center">
  <img src="https://webflow-ui-localization.pages.dev/src/images/icon-128.svg" alt="Webflow UI Localization" width="96">
</p>

[powered-image]: https://img.shields.io/badge/Powered%20by-Extension.js-0971fe
[powered-url]: https://extension.js.org

# Kamoflow - Webflow UI Localization

**Kamoflow** is an open-source browser extension that allows you to translate the UI of Webflow Dashboard and Designer into your language!

It seamlessly translates the interface across the following Webflow surfaces:

Webflow pages:
- `https://webflow.com/dashboard*`
- `https://webflow.com/login*`
- `https://webflow.com/signup*`
- `https://webflow.com/forgot*`

Webflow Designer pages:
- `https://preview.webflow.com*`
- `https://*.design.webflow.com*`

Open the extension’s Options page to select your language. You can also click the toolbar icon to toggle translations at any time — the badge will show OFF when translations are disabled.

The plan is to support Japanese, Traditional Chinese, Simplified Chinese, and Korean first, with more languages to be added over time.

### Contribute translations

**Join to translate togehter on POEditor 🦜**

Contributions to terms (also called strings or nodes) are especially appreciated —  
and it’s easy to get started!   
https://poeditor.com/join/project/7drFUDh3dh

Latest locale JSON files via Cloudflare Pages / jsDelivr:

- [Cloudflare Pages](https://webflow-ui-localization.pages.dev/src/locales/)  
- [jsDelivr](https://www.jsdelivr.com/package/gh/SPACESODA/Webflow-UI-Localization?tab=files&path=src%2Flocales)

<br />
<br />

Made with &hearts; by [Anthony C.](https://x.com/anthonycxc)

---
This extension provides unofficial translations that may not be accurate.

This extension is an independent project and is not affiliated with or endorsed by Webflow. Webflow is a trademark of Webflow, Inc.

This extension does not collect, store, or transmit any personal information or usage data.

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
