/**
 * JSON Formatter Pro - i18n Manager
 * Internationalization utilities (Agent 15)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class I18nManager {
    constructor() {
        this.locale = chrome.i18n.getUILanguage();
        this.dir = chrome.i18n.getMessage('@@bidi_dir') || 'ltr';
        this.init();
    }

    init() {
        // Set document direction and language
        document.documentElement.dir = this.dir;
        document.documentElement.lang = this.locale;

        // Translate on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.translatePage());
        } else {
            this.translatePage();
        }

        // Watch for dynamic content
        this.observeDOM();
    }

    // Get translated message
    t(key, substitutions = []) {
        const message = chrome.i18n.getMessage(key, substitutions);
        if (!message) {
            console.warn(`[i18n] Missing translation: ${key}`);
            return key;
        }
        return message;
    }

    // Translate all elements with data-i18n attributes
    translatePage() {
        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const message = this.t(key);
            if (message && message !== key) {
                el.textContent = message;
            }
        });

        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const message = this.t(key);
            if (message && message !== key) {
                el.placeholder = message;
            }
        });

        // Titles/tooltips
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const message = this.t(key);
            if (message && message !== key) {
                el.title = message;
            }
        });

        // Aria labels
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const message = this.t(key);
            if (message && message !== key) {
                el.setAttribute('aria-label', message);
            }
        });
    }

    // Watch for dynamically added elements
    observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        this.translateElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    translateElement(el) {
        if (el.hasAttribute && el.hasAttribute('data-i18n')) {
            const key = el.getAttribute('data-i18n');
            const message = this.t(key);
            if (message && message !== key) {
                el.textContent = message;
            }
        }

        // Also translate children
        if (el.querySelectorAll) {
            el.querySelectorAll('[data-i18n]').forEach(child => {
                const key = child.getAttribute('data-i18n');
                const message = this.t(key);
                if (message && message !== key) {
                    child.textContent = message;
                }
            });
        }
    }

    // Locale-aware formatting
    formatNumber(number, options = {}) {
        return new Intl.NumberFormat(this.locale, options).format(number);
    }

    formatDate(date, options = {}) {
        const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Intl.DateTimeFormat(this.locale, { ...defaultOptions, ...options }).format(date);
    }

    formatRelativeTime(date) {
        const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
        const diff = date - new Date();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));

        if (Math.abs(days) < 1) {
            const hours = Math.round(diff / (1000 * 60 * 60));
            return rtf.format(hours, 'hour');
        }
        return rtf.format(days, 'day');
    }

    // Check if RTL
    isRTL() {
        return this.dir === 'rtl';
    }

    // Get current locale info
    getLocaleInfo() {
        return {
            locale: this.locale,
            language: this.locale.split('-')[0],
            region: this.locale.split('-')[1] || null,
            direction: this.dir,
            isRTL: this.isRTL()
        };
    }
}

// Export singleton
const i18n = new I18nManager();
export { i18n, I18nManager };
