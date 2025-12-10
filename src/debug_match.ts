
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ');
}

function buildFlexiblePattern(value: string): string {
    return normalizeWhitespace(value)
        .split(' ')
        .map((segment) => escapeRegExp(segment))
        .join('\\s+');
}

function buildTokenizedReplacement(
    sourceString: string,
    flexible: boolean
) {
    // Split keeps placeholder names because the capturing group is retained
    const parts = sourceString.split(/\{([^}]+)\}/g)
    const toPattern = flexible ? buildFlexiblePattern : escapeRegExp
    const tokenNames: string[] = []
    let patternString = '^(\\s*)'
    parts.forEach((part, index) => {
        const isToken = index % 2 === 1
        if (isToken) {
            tokenNames.push(part.trim())
            // Require at least one character for placeholders
            patternString += '(.+?)'
        } else if (part) {
            patternString += toPattern(part)
        }
    })
    patternString += '(\\s*)$'
    const regex = new RegExp(patternString)
    return { regex, tokenNames }
}

function testMatch(label: string, source: string, input: string) {
    console.log(`\n--- ${label} ---`);
    const { regex, tokenNames } = buildTokenizedReplacement(source, true);
    const match = input.match(regex);
    console.log(`Matched? ${!!match}  (Input: "${input.replace(/\n/g, '\\n').replace(/\u00A0/g, '&nbsp;')}")`);
    if (match) {
        const captured = tokenNames.reduce<Record<string, string>>((acc, name, idx) => {
            acc[name || `token${idx + 1}`] = match[idx + 2]; // skip leading whitespace group
            return acc;
        }, {});
        console.log('Captured tokens:', captured);
    }
}

// Case 1: HTML Entities
testMatch("Case 1: NBSP", "under Made in Webflow.", " under\u00A0Made in Webflow.");

// Case 2: Split nodes (Simulation)
// If the text is split, we only match against one chunk.
testMatch("Case 2: Split Start", "You can select up to {*} profile handles...", "You can select up to ");
testMatch("Case 2: Split End", "You can select up to {*} profile handles...", "3 profile handles...");

// Case 3: Newlines
testMatch("Case 3: Newline in input", "under Made in Webflow.", "\nunder Made in Webflow.");
testMatch("Case 3: Inter-word Newline", "under Made in Webflow.", "under\nMade in Webflow.");

// Case 4: Word boundary / punctuation
testMatch("Case 4: Punctuation", "Made in Webflow.", "Made in Webflow"); // Mismatch expected (missing dot)
testMatch("Case 4: Trailing s", "handle", "handles"); // Expected mismatch? 
// Regex for "handle": ^(\s*)handle(\s*)$
// "handles" -> matches "handle"? No. "handle" is literal. s makes it fail. Correct.
