## Instructions for AI

You are assisting me with editing the locale JSON files.  
Locations of the JSON files: `src/locales`

Read the following instructions carefully.

General instructions:

1. Avoid duplicate translations of the exact same key within a file.
2. Save the translated strings in the locale JSON files with correct formatting.
3. DO NOT translate the words specified in `src/locales/_ref/_no_translate.md`. These are mostly brand names, web design terms, web development terms, Webflow terminology. Please use your judgment when handling translations.
4. When updating existing JSON files, please also check the `src/locales/_ref/_new_strings.md` file for new strings.

When editing the locale JSON files:

1. Translate the missing strings in the JSON files according to my instructions.
2. Preserve the original JSON structure and key order, unless you find errors. Only fill in missing values.
3. DO NOT change the existing translations, instead, take them as reference for translating the missing strings.
4. Do NOT include explanations, comments, or markdown.
5. The output must be directly usable as valid JSON. Perform a final check after updating the JSON files.

About translation:

1. Use terminology consistent with modern web design/development across languages.
2. Match Webflow's native UI tone. Use neutral, professional, compact, and contemporary web industry phrasing.
3. Ensure overall consistency in the translations. Review adjacent translations within the same JSON file to understand the big picture and overall nuances.
4. Make sure the translations are accurate and make sense. They should accurately reflect the UI nuances of Webflow with a strong focus on contextual accuracy.

Special note for Chinese:

1. Use the translations in `zh-TW.json` as references for translating the missing strings in `zh-CN.json` (但仍要注意使用簡體中文世界中或現代行業中比較流行的表達方式).
