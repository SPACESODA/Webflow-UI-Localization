/**
 * List of CSS selectors to exclude from translation.
 * Any text node inside an element matching these selectors (or the element itself) will be skipped.
 */

export const EXCLUDED_SELECTORS = [
    // Examples:
    // '#apple-pie',        // ID example
    // '.top-bar',          // Class example
    // '[data-pop="wow"]',  // Attribute example
    // 'nav.top',           // Tag + Class example (excludes <nav class="top"> but not <div class="top">)

    // There are parts in Webflow, especially in the Designer, that should not be translated.
    // Add selectors here:

    'div.bem-SearchResultPreview',
    '[data-automation-id="page-list-row-wrapper"] div.bem-List_Cell',
    '[data-palette="CMSListItem"]',
    '[data-palette="CMSItemsListPanelTitle"]'
    
];
