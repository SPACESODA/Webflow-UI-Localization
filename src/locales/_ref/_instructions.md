## Instructions for AI

You are assisting me with editing the locale JSON files.  
Locations of the JSON files: `src/locales`

Read the following instructions carefully.

Terminology alignment:

- Strings refer to the original Webflow UI text. These correspond to JSON "keys", POEditor "terms", and "nodes" in the codebase.
- Translations refer to the localized text. These correspond to JSON "values".

General instructions:

1. Do not introduce duplicate keys within the same JSON file.
2. Do not change, delete, rename, reorder, or remove any existing keys.
3. Do not edit, rewrite, or correct existing translations unless you are explicitly instructed to review and make changes.
4. DO NOT translate the words specified in `src/locales/_ref/_no_translate.md`. These are mostly brand names, web design terms, web development terms, Webflow terminology. Use judgment where context requires.
5. When updating existing JSON files, please also check the `src/locales/_ref/_new_strings.md` file for new strings.

When editing the locale JSON files:

1. Preserve the original JSON structure and key order, unless you find errors. Only fill in missing values.
2. DO NOT change the existing translations, instead, take them as reference for translating the missing values.
3. Do NOT include explanations, comments, or markdown.
4. The output must be directly usable as valid JSON. Perform a final check after updating the JSON files.

About translation:

1. Use terminology consistent with modern web design/development across languages.
2. Match Webflow's native UI meanings and tone. Use neutral, professional, compact, and contemporary web industry phrasing.
3. Ensure overall consistency in the translations. Review adjacent translations within the same JSON file to understand the big picture and overall nuances.
4. Make sure the translations are accurate and make sense. They should accurately reflect the UI nuances of Webflow with a strong focus on contextual accuracy.
5. If the meaning of a key is unclear, do not guess. First, check `zh-TW.json` for contextual reference. If the intent is still unclear, leave the value blank and request confirmation.

Special note for Chinese:

1. Use the translations in `zh-TW.json` as references for translating the missing strings in `zh-CN.json` (但仍要注意使用簡體中文習慣或現代行業中比較流行的表達方式).
