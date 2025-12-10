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

files.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    console.log(`Checking ${file}...`);

    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // 1. Check for Duplicate Keys (Raw check)
        const keyRegex = /"([^"]+)"\s*:/g;
        const keys = [];
        let match;
        while ((match = keyRegex.exec(content)) !== null) {
            keys.push(match[1]);
        }

        const uniqueKeys = new Set();
        const duplicates = [];
        keys.forEach(key => {
            if (uniqueKeys.has(key)) {
                duplicates.push(key);
            } else {
                uniqueKeys.add(key);
            }
        });

        if (duplicates.length > 0) {
            console.error(`❌ Found duplicate keys in ${file}:`, duplicates);
            hasError = true;
        } else {
            console.log(`✅ No duplicate keys found in ${file}.`);
        }

        // 2. Check JSON Validity
        JSON.parse(content);
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
