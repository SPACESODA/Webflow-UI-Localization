# Adding New Languages Checklist

To add a new language code (e.g. "fr"), update these files:

- `src/types.ts`: Add 'fr' to LanguageCode type.
- `src/locales/fr.json`: Prepare the MAIN translations (via POEditor).
- `src/locales-extension/fr.json`: Prepare the extension's UI translations.
- `src/content/scripts.ts`: Import `src/locales/fr.json` and add to BUNDLED_LANGUAGES object.
- `src/options/OptionsApp.ts`: Import `src/locales-extension/fr.json`, add to LANGUAGES array, and add to EXTENSION_LOCALES.
- `src/content/injections.ts`: Add new language options.
- `.github/scripts/pull-poeditor.mjs`: Add 'fr' to the list for pulling from POEditor.
- `_locales/fr/messages.json`: Create extension metadata (name/description) for Chrome Web Store.

Content updates:

- `src/locales/index.html`: Add new language to the list.
- `src/options/index.html`: Add translations.
