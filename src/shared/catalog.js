/**
 * Zovo Extension Catalog
 * Cross-extension promotion system
 * 
 * @author Zovo (https://zovo.one)
 */

const ZOVO_CATALOG = [
    {
        id: 'tab-suspender-pro',
        name: 'Tab Suspender Pro',
        tagline: 'Save memory, suspend inactive tabs',
        icon: 'https://zovo.one/extensions/tab-suspender-pro/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/tab-suspender-pro',
        category: 'productivity',
        featured: true
    },
    {
        id: 'clipboard-history-pro',
        name: 'Clipboard History Pro',
        tagline: 'Never lose copied text again',
        icon: 'https://zovo.one/extensions/clipboard-history-pro/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/clipboard-history-pro',
        category: 'productivity',
        featured: true
    },
    {
        id: 'json-formatter-pro',
        name: 'JSON Formatter Pro',
        tagline: 'Format and validate JSON instantly',
        icon: 'https://zovo.one/extensions/json-formatter-pro/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/json-formatter-pro',
        category: 'developer',
        featured: true
    },
    {
        id: 'cookie-manager',
        name: 'Cookie Manager',
        tagline: 'View, edit, and manage cookies',
        icon: 'https://zovo.one/extensions/cookie-manager/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/cookie-manager',
        category: 'developer',
        featured: true
    },
    {
        id: 'bookmark-search',
        name: 'Bookmark Search',
        tagline: 'Instantly find any bookmark',
        icon: 'https://zovo.one/extensions/bookmark-search/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/bookmark-search',
        category: 'productivity',
        featured: false
    },
    {
        id: 'quick-notes',
        name: 'Quick Notes',
        tagline: 'Jot down ideas instantly',
        icon: 'https://zovo.one/extensions/quick-notes/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/quick-notes',
        category: 'productivity',
        featured: false
    },
    {
        id: 'base64-encoder',
        name: 'Base64 Encoder',
        tagline: 'Encode and decode base64',
        icon: 'https://zovo.one/extensions/base64-encoder/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/base64-encoder',
        category: 'developer',
        featured: false
    },
    {
        id: 'qr-generator',
        name: 'QR Generator',
        tagline: 'Create QR codes instantly',
        icon: 'https://zovo.one/extensions/qr-generator/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/qr-generator',
        category: 'utility',
        featured: false
    },
    {
        id: 'timestamp-converter',
        name: 'Timestamp Converter',
        tagline: 'Convert timestamps easily',
        icon: 'https://zovo.one/extensions/timestamp-converter/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/timestamp-converter',
        category: 'developer',
        featured: false
    },
    {
        id: 'color-palette',
        name: 'Color Palette',
        tagline: 'Pick and save colors',
        icon: 'https://zovo.one/extensions/color-palette/icon.png',
        storeUrl: 'https://chrome.google.com/webstore/detail/color-palette',
        category: 'design',
        featured: false
    }
];

/**
 * Get extension recommendations (excluding current)
 */
function getRecommendations(currentExtensionId, limit = 3) {
    return ZOVO_CATALOG
        .filter(ext => ext.id !== currentExtensionId)
        .filter(ext => ext.featured)
        .slice(0, limit);
}

/**
 * Get all extensions in catalog
 */
function getCatalog() {
    return ZOVO_CATALOG;
}

/**
 * Get extensions by category
 */
function getByCategory(category) {
    return ZOVO_CATALOG.filter(ext => ext.category === category);
}

/**
 * Maybe show a recommendation (10% chance, max once per day)
 */
async function maybeShowRecommendation(currentExtensionId, showFn) {
    try {
        const { lastRecommendation } = await chrome.storage.local.get('lastRecommendation');
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Check if shown recently
        if (lastRecommendation && lastRecommendation > dayAgo) return;

        // 10% chance
        if (Math.random() > 0.1) return;

        const recommendations = getRecommendations(currentExtensionId, 1);
        if (recommendations.length === 0) return;

        showFn(recommendations[0]);
        await chrome.storage.local.set({ lastRecommendation: Date.now() });
    } catch (error) {
        console.error('[Zovo Catalog] Recommendation error:', error);
    }
}

/**
 * Render cross-promotion panel HTML
 */
function renderCrossPromoPanel(currentExtensionId) {
    const recommendations = getRecommendations(currentExtensionId, 3);

    if (recommendations.length === 0) return '';

    const extensionCards = recommendations.map(ext => `
    <a href="${ext.storeUrl}?ref=${currentExtensionId}" target="_blank" class="zovo-cross-promo-card">
      <img src="${ext.icon}" alt="${ext.name}" class="zovo-cross-promo-icon" onerror="this.style.display='none'">
      <div class="zovo-cross-promo-info">
        <div class="zovo-cross-promo-name">${ext.name}</div>
        <div class="zovo-cross-promo-tagline">${ext.tagline}</div>
      </div>
      <svg class="zovo-cross-promo-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </a>
  `).join('');

    return `
    <div class="zovo-cross-promo">
      <div class="zovo-cross-promo-header">
        <h4 class="zovo-cross-promo-title">More from Zovo</h4>
      </div>
      
      <div class="zovo-cross-promo-membership">
        <div class="zovo-cross-promo-membership-info">
          <span class="zovo-cross-promo-badge">PRO</span>
          <span>Get all Zovo extensions</span>
        </div>
        <a href="https://zovo.one?ref=${currentExtensionId}&source=cross_promo" 
           target="_blank" 
           class="zovo-btn zovo-btn-primary zovo-btn-sm">
          Learn More
        </a>
      </div>

      <div class="zovo-cross-promo-list">
        ${extensionCards}
      </div>
    </div>
  `;
}

// Export for use
window.ZovoCatalog = {
    getRecommendations,
    getCatalog,
    getByCategory,
    maybeShowRecommendation,
    renderCrossPromoPanel,
    CURRENT_EXTENSION_ID: 'json-formatter-pro'
};
