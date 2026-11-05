/**
 * JSON Formatter Pro - Deep Debug Agent 54
 * Browser Compatibility and Edge Case Detection
 * 
 * Top 1% Edge Cases:
 * - Safari clipboard API differences
 * - Firefox storage quota limits
 * - Edge/Chrome subtle API differences
 * - Mobile browser detection
 * - Incognito/private mode limitations
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class CompatGuard {
    constructor() {
        this.browser = this.detectBrowser();
        this.platform = this.detectPlatform();
        this.capabilities = this.detectCapabilities();
    }

    // =====================
    // BROWSER DETECTION
    // =====================

    detectBrowser() {
        const ua = navigator.userAgent;

        // Order matters! Edge includes Chrome, Chrome includes Safari
        if (/Edg\//i.test(ua)) {
            return { name: 'edge', version: this.extractVersion(/Edg\/(\d+)/i, ua) };
        }
        if (/Chrome\/(\d+)/i.test(ua) && !/Chromium/i.test(ua)) {
            return { name: 'chrome', version: this.extractVersion(/Chrome\/(\d+)/i, ua) };
        }
        if (/Firefox\/(\d+)/i.test(ua)) {
            return { name: 'firefox', version: this.extractVersion(/Firefox\/(\d+)/i, ua) };
        }
        if (/Safari\/(\d+)/i.test(ua) && !/Chrome/i.test(ua)) {
            return { name: 'safari', version: this.extractVersion(/Version\/(\d+)/i, ua) };
        }
        if (/OPR\/(\d+)/i.test(ua)) {
            return { name: 'opera', version: this.extractVersion(/OPR\/(\d+)/i, ua) };
        }
        if (/Brave/i.test(ua)) {
            return { name: 'brave', version: this.extractVersion(/Chrome\/(\d+)/i, ua) };
        }

        return { name: 'unknown', version: 0 };
    }

    extractVersion(regex, ua) {
        const match = ua.match(regex);
        return match ? parseInt(match[1], 10) : 0;
    }

    detectPlatform() {
        const platform = navigator.platform?.toLowerCase() || '';
        const ua = navigator.userAgent.toLowerCase();

        return {
            isMac: platform.includes('mac'),
            isWindows: platform.includes('win'),
            isLinux: platform.includes('linux'),
            isIOS: /iphone|ipad|ipod/.test(ua),
            isAndroid: ua.includes('android'),
            isMobile: /mobile|android|iphone|ipad/.test(ua)
        };
    }

    // =====================
    // CAPABILITY DETECTION
    // =====================

    detectCapabilities() {
        return {
            clipboard: this.hasClipboardAPI(),
            storage: this.hasStorageAPI(),
            cryptoUUID: typeof crypto?.randomUUID === 'function',
            performanceMemory: typeof performance?.memory !== 'undefined',
            serviceWorker: 'serviceWorker' in navigator,
            webAssembly: typeof WebAssembly !== 'undefined',
            requestIdleCallback: typeof requestIdleCallback === 'function'
        };
    }

    hasClipboardAPI() {
        return !!(navigator.clipboard?.writeText && navigator.clipboard?.readText);
    }

    hasStorageAPI() {
        try {
            localStorage.setItem('__test__', 'test');
            localStorage.removeItem('__test__');
            return true;
        } catch {
            return false;
        }
    }

    // =====================
    // INCOGNITO DETECTION
    // =====================

    /**
     * Detect incognito/private mode
     * CRITICAL: Storage quotas differ in private mode
     */
    async isIncognito() {
        // Chrome/Edge
        if (this.browser.name === 'chrome' || this.browser.name === 'edge') {
            try {
                const quota = await navigator.storage?.estimate();
                // Chrome incognito has very limited quota
                return quota?.quota < 120000000; // ~120MB
            } catch {
                return false;
            }
        }

        // Firefox
        if (this.browser.name === 'firefox') {
            try {
                const db = indexedDB.open('test');
                db.onerror = () => true; // Incognito blocks IndexedDB
                return false;
            } catch {
                return true;
            }
        }

        // Safari - try writing to localStorage
        if (this.browser.name === 'safari') {
            try {
                localStorage.setItem('__incognito_test__', 'test');
                localStorage.removeItem('__incognito_test__');
                return false;
            } catch {
                return true;
            }
        }

        return false;
    }

    // =====================
    // CLIPBOARD WORKAROUNDS
    // =====================

    /**
     * Cross-browser clipboard write
     */
    async writeToClipboard(text) {
        // Modern API
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return { success: true, method: 'modern' };
            } catch (e) {
                // Fall through to legacy
            }
        }

        // Legacy fallback
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, text.length);

            const success = document.execCommand('copy');
            document.body.removeChild(textarea);

            return { success, method: 'legacy' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Cross-browser clipboard read
     */
    async readFromClipboard() {
        // Modern API
        if (navigator.clipboard?.readText) {
            try {
                const text = await navigator.clipboard.readText();
                return { success: true, text, method: 'modern' };
            } catch (e) {
                // Clipboard access denied
                return { success: false, error: 'Permission denied' };
            }
        }

        return { success: false, error: 'Clipboard API not available' };
    }

    // =====================
    // STORAGE WORKAROUNDS
    // =====================

    /**
     * Get available storage quota
     */
    async getStorageQuota() {
        try {
            if (navigator.storage?.estimate) {
                const { quota, usage } = await navigator.storage.estimate();
                return {
                    total: quota,
                    used: usage,
                    available: quota - usage,
                    percentage: Math.round((usage / quota) * 100)
                };
            }
        } catch {
            // Fallback estimate
        }

        return {
            total: 5 * 1024 * 1024, // 5MB conservative estimate
            used: 0,
            available: 5 * 1024 * 1024,
            percentage: 0
        };
    }

    /**
     * Safe storage set with quota check
     */
    async safeStorageSet(key, value) {
        try {
            const serialized = JSON.stringify(value);
            const size = new Blob([serialized]).size;

            // Check quota before storing
            const quota = await this.getStorageQuota();
            if (size > quota.available * 0.9) {
                return { success: false, error: 'Quota exceeded' };
            }

            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ [key]: value });
            } else {
                localStorage.setItem(key, serialized);
            }

            return { success: true, size };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // =====================
    // FEATURE POLYFILLS
    // =====================

    /**
     * Polyfill crypto.randomUUID
     */
    randomUUID() {
        if (crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // Fallback for Safari < 15.4
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Polyfill requestIdleCallback
     */
    requestIdleCallback(callback, options) {
        if (window.requestIdleCallback) {
            return window.requestIdleCallback(callback, options);
        }

        // Fallback using setTimeout
        const timeout = options?.timeout || 50;
        return setTimeout(() => {
            callback({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (Date.now() % 50))
            });
        }, 1);
    }

    // =====================
    // DIAGNOSTICS
    // =====================

    /**
     * Get full compatibility report
     */
    async getCompatibilityReport() {
        return {
            browser: this.browser,
            platform: this.platform,
            capabilities: this.capabilities,
            incognito: await this.isIncognito(),
            storage: await this.getStorageQuota(),
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton
const compatGuard = new CompatGuard();
export { compatGuard, CompatGuard };
