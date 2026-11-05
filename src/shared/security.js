/**
 * JSON Formatter Pro - Security Hardening
 * Input sanitization and XSS prevention (Agent 18)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

const SecurityUtils = {
    /**
     * Sanitize HTML to prevent XSS
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(html) {
        if (!html) return '';

        // Create a temporary div and set text content (auto-escapes)
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    },

    /**
     * Escape HTML entities
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHTML(str) {
        if (!str) return '';

        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };

        return String(str).replace(/[&<>"'`=/]/g, s => escapeMap[s]);
    },

    /**
     * Sanitize JSON for display (escape special chars in strings)
     * @param {*} obj - Object to sanitize
     * @returns {*} Sanitized object
     */
    sanitizeJSON(obj) {
        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'string') {
            return this.escapeHTML(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeJSON(item));
        }

        if (typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = this.escapeHTML(key);
                sanitized[sanitizedKey] = this.sanitizeJSON(value);
            }
            return sanitized;
        }

        return obj;
    },

    /**
     * Validate URL safety
     * @param {string} url - URL to validate
     * @returns {boolean} Whether URL is safe
     */
    isURLSafe(url) {
        if (!url) return false;

        try {
            const parsed = new URL(url);

            // Only allow http/https
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return false;
            }

            // Block javascript: URLs (should be caught by protocol check)
            if (url.toLowerCase().startsWith('javascript:')) {
                return false;
            }

            // Block data: URLs
            if (url.toLowerCase().startsWith('data:')) {
                return false;
            }

            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Validate that input is valid JSON
     * @param {string} str - String to validate
     * @returns {{valid: boolean, error?: string}}
     */
    validateJSON(str) {
        if (!str || typeof str !== 'string') {
            return { valid: false, error: 'Input must be a non-empty string' };
        }

        // Size limit (5MB)
        if (str.length > 5 * 1024 * 1024) {
            return { valid: false, error: 'JSON exceeds maximum size (5MB)' };
        }

        try {
            JSON.parse(str);
            return { valid: true };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    },

    /**
     * Create a safe DOM element
     * @param {string} tag - Element tag name
     * @param {Object} attrs - Attributes to set (sanitized)
     * @param {string} text - Text content (sanitized)
     * @returns {HTMLElement}
     */
    createElement(tag, attrs = {}, text = null) {
        const el = document.createElement(tag);

        for (const [key, value] of Object.entries(attrs)) {
            // Skip dangerous attributes
            if (['onclick', 'onerror', 'onload', 'onmouseover'].includes(key.toLowerCase())) {
                console.warn('[Security] Blocked dangerous attribute:', key);
                continue;
            }

            // For href/src, validate URL
            if (['href', 'src'].includes(key.toLowerCase())) {
                if (!this.isURLSafe(value)) {
                    console.warn('[Security] Blocked unsafe URL:', value);
                    continue;
                }
            }

            el.setAttribute(key, this.escapeHTML(String(value)));
        }

        if (text !== null) {
            el.textContent = text; // Auto-escaped
        }

        return el;
    },

    /**
     * Generate a cryptographically secure random string
     * @param {number} length - Length of string to generate
     * @returns {string} Random string
     */
    generateSecureId(length = 16) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * CSP violation reporter
     * @param {string} report - CSP report JSON
     */
    logCSPViolation(report) {
        console.error('[Security] CSP Violation:', report);
        // Could send to error tracker here
    }
};

// Freeze to prevent tampering
Object.freeze(SecurityUtils);

export { SecurityUtils };
