[powered-image]: https://img.shields.io/badge/Powered%20by-Extension.js-0971fe
[powered-url]: https://extension.js.org

![Powered by Extension.js][powered-image]

# Webflow UI Localization

> Translate the Webflow dashboard UI into Japanese or Traditional Chinese.

The extension swaps common UI strings on these Webflow surfaces:

- `https://webflow.com/dashboard*`
- `https://preview.webflow.com*`
- `https://*.design.webflow.com*`

Open the extension’s Options page (click the extension icon) to choose between Japanese and Traditional Chinese or turn translations off to stay in English. Click the toolbar icon any time to toggle translations (badge shows OFF when disabled). Your choice is saved and applied automatically on matching Webflow pages.

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

## Learn more

Learn more about creating cross-browser extensions at https://extension.js.org
