# Token placeholder matching and assertions

This project replaces localized strings that may include placeholders like `{name}` or `{count}`. To prevent silent errors when placeholders are missing or malformed, use the regex built by `buildTokenizedReplacement` to assert placeholder integrity before performing replacements.

## Background
This approach came from debugging localization misses where translated strings matched the surrounding text but silently dropped or malformed placeholders (e.g., `{name}` empty, `{ count }` not captured). By making placeholder presence part of the match, we catch these structural errors before they ship.

## How to use
- Build the pattern: `const { regex, tokenNames } = buildTokenizedReplacement(sourceString, true);`
  - `sourceString` is the canonical string with placeholders (e.g., `"Hello, {name}!"`).
  - `flexible = true` lets whitespace vary between segments.
- Match incoming text: `const match = input.match(regex);`
  - If `match` is falsy, the text doesn’t align with the expected placeholders; skip or flag it.
- Read captured tokens:
  ```ts
  const captured = tokenNames.reduce<Record<string, string>>((acc, name, idx) => {
    acc[name || `token${idx + 1}`] = match[idx + 2]; // group 1 is leading whitespace
    return acc;
  }, {});
  ```
- Assert before replacing:
  - Ensure every `tokenNames` entry exists in `captured` and is non-empty.
  - Only perform the replacement/translation when all placeholders are present.

## Why this matters
- Avoids translating strings that are missing required dynamic parts.
- Prevents malformed tokens (e.g., `{ name` or `{}`) from slipping through.
- Gives clearer debugging: you can log which placeholder failed to match.

## Status / guidance
- Recommendation for future-proofing: adopting this check is advised to reduce silent placeholder loss, but it’s not mandatory if your current pipeline already enforces placeholders elsewhere.
- Further consideration: tighten per-placeholder patterns (e.g., numeric, UUID) if you need stricter validation, and decide where to surface failures (console, logs, or CI).

## Related files
- `src/debug_match.ts`: builds the placeholder-aware regex and logs captured tokens.
- `verify_json.mjs`: locale validator (not directly about placeholders, but part of the validation tooling).

## Optional enforcement examples
- Reject empty placeholders: use `(.+?)` (already applied) so `{name}` must have content.
- Stricter typing per placeholder: replace `(.+?)` with context-aware patterns (e.g., `\\d+` for numeric counts) if needed.
- Diagnostics: when `match` fails, log the source string and input snippet to spot structural mismatches quickly.
