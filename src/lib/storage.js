/**
 * JSON Formatter Pro - Storage Utilities
 * Manages settings, snippets, and history using Chrome storage
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

const DEFAULTS = {
    // Editor settings
    indent: 2,
    sortKeys: false,
    theme: 'dark',
    fontSize: 13,
    wordWrap: true,
    showLineNumbers: true,
    autoFormat: false,

    // Pro status
    isPro: false,
    proExpiresAt: null,

    // Usage tracking (local only, for retention prompts)
    usageCount: 0,
    installedAt: null,
    lastUsedAt: null,
    onboardingComplete: false,

    // Retention prompts
    dismissedPrompts: [],

    // Pro features
    snippets: [],
    history: []
};

// Check if Chrome storage API is available (not available when running as file://)
const isChromeStorageAvailable = () => {
    return typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.local;
};

const Storage = {
    /**
     * Get a single value from storage
     * @param {string} key - Storage key
     * @returns {Promise<any>}
     */
    async get(key) {
        if (!isChromeStorageAvailable()) {
            return DEFAULTS[key];
        }
        try {
            const result = await chrome.storage.local.get({ [key]: DEFAULTS[key] });
            return result[key];
        } catch (error) {
            console.error(`Storage.get error for ${key}:`, error);
            return DEFAULTS[key];
        }
    },

    /**
     * Get all settings from storage
     * @returns {Promise<Object>}
     */
    async getAll() {
        if (!isChromeStorageAvailable()) {
            return { ...DEFAULTS };
        }
        try {
            return await chrome.storage.local.get(DEFAULTS);
        } catch (error) {
            console.error('Storage.getAll error:', error);
            return { ...DEFAULTS };
        }
    },

    /**
     * Set a single value in storage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @returns {Promise<void>}
     */
    async set(key, value) {
        if (!isChromeStorageAvailable()) {
            return;
        }
        try {
            await chrome.storage.local.set({ [key]: value });
        } catch (error) {
            console.error(`Storage.set error for ${key}:`, error);
        }
    },

    /**
     * Set multiple values in storage
     * @param {Object} data - Key-value pairs to store
     * @returns {Promise<void>}
     */
    async setMultiple(data) {
        if (!isChromeStorageAvailable()) {
            return;
        }
        try {
            await chrome.storage.local.set(data);
        } catch (error) {
            console.error('Storage.setMultiple error:', error);
        }
    },

    /**
     * Increment a numeric value
     * @param {string} key - Storage key
     * @returns {Promise<number>}
     */
    async increment(key) {
        const current = await this.get(key);
        const newValue = (current || 0) + 1;
        await this.set(key, newValue);
        return newValue;
    },

    /**
     * Initialize storage on first install
     * @returns {Promise<void>}
     */
    async initialize() {
        const { installedAt } = await chrome.storage.local.get('installedAt');
        if (!installedAt) {
            await this.setMultiple({
                installedAt: Date.now(),
                usageCount: 0,
                history: [],
                snippets: [],
                dismissedPrompts: []
            });
        }
    },

    /**
     * Track a usage event
     * @returns {Promise<number>} New usage count
     */
    async trackUsage() {
        await this.set('lastUsedAt', Date.now());
        return this.increment('usageCount');
    },

    // =====================
    // Pro Feature Management
    // =====================

    /**
     * Check if user has Pro access (via API verification)
     * @returns {Promise<boolean>}
     */
    async checkPro() {
        // Try to use API verification if available
        if (typeof window !== 'undefined' && window.ZovoAPI) {
            try {
                return await window.ZovoAPI.isPro();
            } catch (error) {
                console.error('[Storage] API Pro check failed:', error);
            }
        }

        // Fallback to local storage check
        if (!isChromeStorageAvailable()) {
            return false;
        }
        try {
            // Check for license key first
            const { licenseKey } = await chrome.storage.sync.get('licenseKey');
            if (licenseKey) {
                return true; // Has license key, assume Pro (API will verify on actual use)
            }

            // Legacy check for isPro flag
            const { isPro, proExpiresAt } = await chrome.storage.sync.get({
                isPro: false,
                proExpiresAt: null
            });

            if (!isPro) return false;
            if (!proExpiresAt) return true; // Lifetime Pro

            return Date.now() < proExpiresAt;
        } catch (error) {
            return false;
        }
    },

    /**
     * Set Pro status
     * @param {boolean} isPro - Pro status
     * @param {number|null} expiresAt - Expiration timestamp (null for lifetime)
     * @returns {Promise<void>}
     */
    async setPro(isPro, expiresAt = null) {
        if (!isChromeStorageAvailable()) {
            return;
        }
        try {
            await chrome.storage.sync.set({ isPro, proExpiresAt: expiresAt });
        } catch (error) {
            try {
                await chrome.storage.local.set({ isPro, proExpiresAt: expiresAt });
            } catch {
                // Silently fail in non-extension contexts
            }
        }
    },

    // =====================
    // Snippets (Pro Feature)
    // =====================

    /**
     * Get all saved snippets
     * @returns {Promise<Array>}
     */
    async getSnippets() {
        return this.get('snippets');
    },

    /**
     * Save a new snippet
     * @param {Object} snippet - Snippet data { name, json, description? }
     * @returns {Promise<Object>}
     */
    async saveSnippet(snippet) {
        const snippets = await this.getSnippets();
        const newSnippet = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name: snippet.name,
            json: snippet.json,
            description: snippet.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        snippets.unshift(newSnippet);
        await this.set('snippets', snippets);
        return newSnippet;
    },

    /**
     * Update an existing snippet
     * @param {string} id - Snippet ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>}
     */
    async updateSnippet(id, updates) {
        const snippets = await this.getSnippets();
        const index = snippets.findIndex(s => s.id === id);

        if (index === -1) return false;

        snippets[index] = {
            ...snippets[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.set('snippets', snippets);
        return true;
    },

    /**
     * Delete a snippet
     * @param {string} id - Snippet ID
     * @returns {Promise<boolean>}
     */
    async deleteSnippet(id) {
        const snippets = await this.getSnippets();
        const filtered = snippets.filter(s => s.id !== id);

        if (filtered.length === snippets.length) return false;

        await this.set('snippets', filtered);
        return true;
    },

    // =====================
    // History Management
    // =====================

    /**
     * Get format history
     * @returns {Promise<Array>}
     */
    async getHistory() {
        return this.get('history');
    },

    /**
     * Add entry to format history
     * @param {string} json - JSON string (truncated if too large)
     * @returns {Promise<void>}
     */
    async addToHistory(json) {
        const history = await this.getHistory();
        const isPro = await this.checkPro();

        // Truncate large JSON
        const maxSize = 10000;
        const truncatedJson = json.length > maxSize
            ? json.substring(0, maxSize) + '...'
            : json;

        // Create history entry
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            json: truncatedJson,
            size: json.length,
            timestamp: new Date().toISOString()
        };

        // Add to beginning
        history.unshift(entry);

        // Limit based on Pro status
        const limit = isPro ? 50 : 10;
        const trimmed = history.slice(0, limit);

        await this.set('history', trimmed);
    },

    /**
     * Clear all history
     * @returns {Promise<void>}
     */
    async clearHistory() {
        await this.set('history', []);
    },

    /**
     * Delete a single history entry
     * @param {string} id - History entry ID
     * @returns {Promise<boolean>}
     */
    async deleteHistoryEntry(id) {
        const history = await this.getHistory();
        const filtered = history.filter(h => h.id !== id);

        if (filtered.length === history.length) return false;

        await this.set('history', filtered);
        return true;
    },

    // =====================
    // Retention Prompts
    // =====================

    /**
     * Dismiss a retention prompt
     * @param {string} promptId - Prompt ID to dismiss
     * @returns {Promise<void>}
     */
    async dismissPrompt(promptId) {
        const dismissed = await this.get('dismissedPrompts') || [];
        if (!Array.isArray(dismissed)) {
            await this.set('dismissedPrompts', [promptId]);
            return;
        }
        if (!dismissed.includes(promptId)) {
            dismissed.push(promptId);
            await this.set('dismissedPrompts', dismissed);
        }
    },

    /**
     * Check if a prompt has been dismissed
     * @param {string} promptId - Prompt ID to check
     * @returns {Promise<boolean>}
     */
    async isPromptDismissed(promptId) {
        const dismissed = await this.get('dismissedPrompts');
        return dismissed.includes(promptId);
    }
};

// Export for use in extension
if (typeof window !== 'undefined') {
    window.Storage = Storage;
}
