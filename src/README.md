# Notes to Translation Contributors

Translations are not managed directly in the repo.  

Please contribute on POEditor: 
https://poeditor.com/join/project/7drFUDh3dh

(There is a GitHub Action that pulls updated locale JSONs from POEditor a few times a day and commits automatically.)


# Adding New Terms to POEditor

Found an untranslated word? Be a hero! 🦸‍♂️🦸‍♀️

Translating Webflow UI is a big team effort. We need your help to find missing words. It is like a treasure hunt — by adding these words, you make Webflow easier to use for thousands of designers in your language.

**Important:** Please only add terms that appear within the scope of this extension.

Webflow pages:
- `https://webflow.com/dashboard*`
- `https://webflow.com/login*`
- `https://webflow.com/signup*`
- `https://webflow.com/forgot*`

Webflow Designer pages:
- `https://preview.webflow.com*`
- `https://*.design.webflow.com*`


# Placeholder Conventions

#### Fuzzy Tokens:
Use the wildcard token when the variable name is unknown or irrelevant.
- **Syntax**: `{*}`
- **Rule**: The extension matches `{*}` tokens by order of appearance. The first `{*}` in the source string corresponds to the first `{*}` in the translated string.
- **Examples**:
  - "Client Workspaces (2)" as `Client Workspaces ({*})`
  - "32 pages" as `{*} pages`
  - "Published by Peter Pan 12 hours ago" as `Published by {*} {*} {*} ago`
- **Reminder**: The matching can be ambiguous in this case if `{*}` is used multiple times contiguously in the source string as it is hard for the extension to know which variable each `{*}` should be replaced with. It may be safer just leave it not translated.

#### Named Tokens:
Use named tokens when the variable context is clear. These are robust and allow for reordering in the target language if necessary.
- **Syntax**: `{count}`, `{name}`, `{date}`, `{0}`, `{1}`, etc.
- **Rule**: Do not translate the content inside { } — do not change `{name}` to `{名}`.


# Terms Not to be Translated

Please visit [`src/locales/_ref_ai/_no_translate.md`](https://github.com/SPACESODA/Webflow-UI-Localization/blob/main/src/locales/_ref/_no_translate.md) for the list.
