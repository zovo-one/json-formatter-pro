/**
 * JSON Formatter Pro - Cross-Browser API
 * Unified API abstraction layer (Agent 16)
 * 
 * Provides consistent API across Chrome, Firefox, Safari, Edge
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

import { BrowserDetector } from './browser-detect.js';

class CrossBrowserAPI {
    constructor() {
        this.browser = BrowserDetector.detect();
    }

    // =====================
    // STORAGE API
    // =====================

    async storageGet(keys) {
        return chrome.storage.local.get(keys);
    }

    async storageSet(items) {
        return chrome.storage.local.set(items);
    }

    async storageRemove(keys) {
        return chrome.storage.local.remove(keys);
    }

    // Sync storage with Safari fallback
    async syncGet(keys) {
        if (this.browser === 'safari') {
            // Safari doesn't support sync, use local
            return chrome.storage.local.get(keys);
        }
        return chrome.storage.sync.get(keys);
    }

    async syncSet(items) {
        if (this.browser === 'safari') {
            return chrome.storage.local.set(items);
        }
        return chrome.storage.sync.set(items);
    }

    // =====================
    // TABS API
    // =====================

    async getCurrentTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0];
    }

    async createTab(options) {
        return chrome.tabs.create(options);
    }

    async sendMessageToTab(tabId, message) {
        return chrome.tabs.sendMessage(tabId, message);
    }

    // =====================
    // SCRIPTING API
    // =====================

    async executeScript(tabId, options) {
        if (chrome.scripting) {
            // MV3 style
            return chrome.scripting.executeScript({
                target: { tabId },
                ...options
            });
        }

        // MV2 fallback (Firefox)
        if (options.func) {
            return chrome.tabs.executeScript(tabId, {
                code: `(${options.func.toString()})()`
            });
        }

        if (options.files) {
            return chrome.tabs.executeScript(tabId, {
                file: options.files[0]
            });
        }
    }

    // =====================
    // CLIPBOARD API
    // =====================

    async copyToClipboard(text) {
        // Try modern API first
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (e) {
                // Fall through to fallback
            }
        }

        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            return true;
        } finally {
            document.body.removeChild(textarea);
        }
    }

    async readFromClipboard() {
        if (navigator.clipboard?.readText) {
            try {
                return await navigator.clipboard.readText();
            } catch (e) {
                console.warn('[CrossBrowserAPI] Clipboard read failed:', e);
                return null;
            }
        }
        return null;
    }

    // =====================
    // NOTIFICATIONS
    // =====================

    async notify(id, options) {
        const notificationOptions = {
            type: options.type || 'basic',
            title: options.title,
            message: options.message,
            iconUrl: options.iconUrl || chrome.runtime.getURL('assets/icons/icon-48.png')
        };

        // Safari has limited notification support
        if (this.browser === 'safari' && 'Notification' in self) {
            if (Notification.permission === 'granted') {
                return new Notification(options.title, {
                    body: options.message,
                    icon: notificationOptions.iconUrl
                });
            }
        }

        return chrome.notifications.create(id, notificationOptions);
    }

    // =====================
    // ACTION API
    // =====================

    get action() {
        return chrome.action || chrome.browserAction;
    }

    async setBadgeText(text, tabId = null) {
        const options = { text };
        if (tabId) options.tabId = tabId;
        return this.action.setBadgeText(options);
    }

    async setBadgeColor(color, tabId = null) {
        const options = { color };
        if (tabId) options.tabId = tabId;
        return this.action.setBadgeBackgroundColor(options);
    }

    // =====================
    // CONTEXT MENUS
    // =====================

    createContextMenu(options) {
        return chrome.contextMenus.create(options);
    }

    removeContextMenu(menuItemId) {
        return chrome.contextMenus.remove(menuItemId);
    }

    // =====================
    // RUNTIME
    // =====================

    getURL(path) {
        return chrome.runtime.getURL(path);
    }

    async sendMessage(message) {
        return chrome.runtime.sendMessage(message);
    }

    onMessage(callback) {
        chrome.runtime.onMessage.addListener(callback);
    }

    // =====================
    // UTILITIES
    // =====================

    /**
     * Get browser-specific manifest adjustments for Firefox
     */
    getFirefoxManifestPatch() {
        return {
            browser_specific_settings: {
                gecko: {
                    id: 'json-formatter-pro@zovo.one',
                    strict_min_version: '109.0'
                }
            },
            background: {
                scripts: ['src/background/service-worker.js'],
                type: 'module'
            }
        };
    }
}

// Export singleton
const api = new CrossBrowserAPI();
export { api, CrossBrowserAPI };
