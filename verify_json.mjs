/**
 * Verification Script for Locale JSON Files
 * 
 * Purpose:
 * 1. Checks for duplicate keys in the locale JSON files.
 * 2. Validates that the locale files are valid JSON.
 * 
 * Usage: npm run verify-locales
 */

import fs from 'fs';
import path from 'path';

const files = [
    'src/locales/ja.json',
    'src/locales/zh-TW.json',
    'src/locales/zh-CN.json',
    'src/locales/ko.json'
];

let hasError = false;

// Regex to match valid JSON numbers (see ECMA-404)
const JSON_NUMBER_REGEX = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/;

/**
 * Lightweight JSON parser to detect duplicate keys per object while still
 * validating that the JSON is well-formed. Avoids false positives from
 * sibling objects using the same property names.
 */
function verifyJsonStructure(source) {
    let index = 0;
    const duplicates = [];



    function error(message) {
        throw new Error(`${message} at position ${index}`);
    }

    function currentChar() {
        return source[index];
    }

    function advance(step = 1) {
        index += step;
    }

    function skipWhitespace() {
        while (/\s/.test(currentChar())) advance();
    }

    function parseString() {
        if (currentChar() !== '"') error('Expected string');
        const start = index;
        advance(); // skip opening quote
        while (index < source.length) {
            const ch = currentChar();
            if (ch === '\\') {
                advance(2); // skip escaped char
                continue;
            }
            if (ch === '"') {
                const raw = source.slice(start, index + 1);
                try {
                    // Use JSON.parse to properly unescape
                    JSON.parse(raw);
                } catch (e) {
                    error(`Invalid string escape sequence in ${raw}: ${e?.message || e}`);
                }
                advance(); // closing quote
                return raw;
            }
            advance();
        }
        error('Unterminated string');
    }

    function parseNumber() {
        const remaining = source.slice(index);
        const match = remaining.match(JSON_NUMBER_REGEX);
        if (!match) error('Invalid number');
        advance(match[0].length);
    }

    function parseLiteral(expected) {
        if (source.slice(index, index + expected.length) !== expected) {
            error(`Expected ${expected}`);
        }
        advance(expected.length);
    }

    function parseArray() {
        advance(); // skip [
        skipWhitespace();
        if (currentChar() === ']') {
            advance();
            return;
        }
        while (true) {
            parseValue();
            skipWhitespace();
            const ch = currentChar();
            if (ch === ',') {
                advance();
                skipWhitespace();
                continue;
            }
            if (ch === ']') {
                advance();
                return;
            }
            error('Expected , or ] in array');
        }
    }

    function parseObject() {
        advance(); // skip {
        skipWhitespace();
        const seenKeys = new Set();
        if (currentChar() === '}') {
            advance();
            return;
        }
        while (true) {
            skipWhitespace();

            const rawKey = parseString();
            const key = JSON.parse(rawKey);
            skipWhitespace();
            if (currentChar() !== ':') error('Expected : after key');
            advance();
            skipWhitespace();
            if (seenKeys.has(key)) {
                duplicates.push(key);
            } else {
                seenKeys.add(key);
            }
            parseValue();
            skipWhitespace();
            const ch = currentChar();
            if (ch === ',') {
                advance();
                skipWhitespace();
                continue;
            }
            if (ch === '}') {
                advance();
                return;
            }
            error('Expected , or } in object');
        }
    }

    function parseValue() {
        skipWhitespace();
        const ch = currentChar();
        if (ch === '"') return parseString();
        if (ch === '{') return parseObject();
        if (ch === '[') return parseArray();
        if (ch === '-' || (ch >= '0' && ch <= '9')) return parseNumber();
        if (ch === 't') return parseLiteral('true');
        if (ch === 'f') return parseLiteral('false');
        if (ch === 'n') return parseLiteral('null');
        error('Unexpected character');
    }

    parseValue();
    skipWhitespace();
    if (index !== source.length) {
        error('Unexpected trailing content');
    }

    return duplicates;
}

files.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    console.log(`Checking ${file}...`);

    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Validate structure and detect duplicates per object
        const duplicates = verifyJsonStructure(content);
        if (duplicates.length > 0) {
            console.error(`❌ Found duplicate keys in ${file}:`, [...new Set(duplicates)]);
            hasError = true;
        } else {
            console.log(`✅ No duplicate keys found in ${file}.`);
        }
        console.log(`✅ Valid JSON format: ${file}`);

    } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
        hasError = true;
    }
    console.log('-----------------------------------');
});

if (hasError) {
    process.exit(1);
} else {
    console.log('All checks passed!');
}
