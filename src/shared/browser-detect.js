/**
 * JSON Formatter Pro - Browser Detection
 * Cross-browser compatibility utility (Agent 16)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

const BrowserDetector = {
    /**
     * Detect current browser
     * @returns {string} Browser name: chrome, firefox, safari, edge, brave, opera
     */
    detect() {
        const ua = navigator.userAgent;

        // Firefox
        if (typeof browser !== 'undefined' && browser.runtime?.getBrowserInfo) {
            return 'firefox';
        }

        // Safari (must check before Chrome since Safari UA may include Chrome)
        if (ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')) {
            return 'safari';
        }

        // Edge (Chromium-based)
        if (ua.includes('Edg/')) {
            return 'edge';
        }

        // Brave
        if (navigator.brave?.isBrave) {
            return 'brave';
        }

        // Opera
        if (ua.includes('OPR/') || ua.includes('Opera')) {
            return 'opera';
        }

        // Vivaldi
        if (ua.includes('Vivaldi')) {
            return 'vivaldi';
        }

        // Default to Chrome
        return 'chrome';
    },

    /**
     * Check if browser is Chromium-based
     */
    isChromium() {
        const browser = this.detect();
        return ['chrome', 'edge', 'brave', 'opera', 'vivaldi'].includes(browser);
    },

    /**
     * Check if browser is Firefox
     */
    isFirefox() {
        return this.detect() === 'firefox';
    },

    /**
     * Check if browser is Safari
     */
    isSafari() {
        return this.detect() === 'safari';
    },

    /**
     * Get browser info object
     */
    getInfo() {
        const browser = this.detect();
        const manifest = chrome.runtime.getManifest();

        return {
            browser,
            isChromium: this.isChromium(),
            manifestVersion: manifest.manifest_version,
            extensionVersion: manifest.version,
            userAgent: navigator.userAgent.substring(0, 100)
        };
    },

    /**
     * Check if specific API is available
     */
    hasAPI(apiPath) {
        const parts = apiPath.split('.');
        let current = typeof browser !== 'undefined' ? browser : chrome;

        for (const part of parts) {
            if (!current || typeof current[part] === 'undefined') {
                return false;
            }
            current = current[part];
        }
        return true;
    },

    /**
     * Feature availability checks
     */
    features: {
        get sidePanel() {
            return BrowserDetector.hasAPI('sidePanel');
        },
        get tabGroups() {
            return BrowserDetector.hasAPI('tabGroups');
        },
        get scripting() {
            return BrowserDetector.hasAPI('scripting');
        },
        get offscreen() {
            return BrowserDetector.hasAPI('offscreen');
        },
        get containerTabs() {
            return BrowserDetector.hasAPI('contextualIdentities');
        },
        get storageSync() {
            return BrowserDetector.hasAPI('storage.sync');
        }
    }
};

export { BrowserDetector };
