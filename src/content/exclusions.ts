/**
 * List of CSS selectors to exclude from translation.
 * Any text node inside an element matching these selectors (or the element itself) will be skipped.
 */

export const EXCLUDED_SELECTORS = [
    // Examples:
    // '#apple-pie',         // ID example
    // '.top-gun',           // Class example
    // '[data-pop="bomb"]',  // Attribute example
    // 'nav.qqq',            // Tag + Class example (excludes <nav class="qqq"> but not <div class="qqq">)
    // Add more selectors here...
    // There are some parts in the Webflow Designer should not be translated.
    
];
