[powered-image]: https://img.shields.io/badge/Powered%20by-Extension.js-0971fe
[powered-url]: https://extension.js.org

# Webflow UI Localization

> Translate the Webflow Dashboard and Designer's UI into other languages.

The extension swaps common UI strings on these Webflow surfaces:

- `https://webflow.com/dashboard*`
- `https://preview.webflow.com*`
- `https://*.design.webflow.com*`

Open the extension’s Options page (click the extension icon) to choose your language or turn translations off to stay in original English. You can also click the toolbar extension icon to toggle translations (badge shows OFF when disabled).

Created with love by [Anthony C.](https://x.com/anthonycxc)

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

# Firefox
npm run dev -- --browser=firefox
```


![Powered by Extension.js][powered-image]
