/**
 * JSON Formatter Pro - Safe DOM Utilities
 * XSS prevention through safe DOM manipulation (md-18 Agent 26)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class SafeDOM {
    // =====================
    // ELEMENT CREATION
    // =====================

    /**
     * Safely create an element with attributes
     */
    static createElement(tag, attributes = {}, textContent = '') {
        const allowedTags = new Set([
            'div', 'span', 'p', 'a', 'button', 'input', 'label',
            'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'form', 'select', 'option',
            'textarea', 'pre', 'code', 'section', 'article', 'header', 'footer',
            'nav', 'main', 'aside', 'figure', 'figcaption', 'strong', 'em', 'br'
        ]);

        const tagLower = tag.toLowerCase();
        if (!allowedTags.has(tagLower)) {
            console.warn(`[SafeDOM] Tag not allowed: ${tag}`);
            return document.createElement('div');
        }

        const element = document.createElement(tagLower);

        for (const [key, value] of Object.entries(attributes)) {
            this.setAttributeSafe(element, key, value);
        }

        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }

    /**
     * Safely set text content (XSS-safe)
     */
    static setText(element, text) {
        if (typeof text !== 'string') {
            text = String(text ?? '');
        }
        element.textContent = text;
    }

    /**
     * Safely set an attribute
     */
    static setAttributeSafe(element, name, value) {
        const dangerousAttributes = new Set([
            'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus',
            'onblur', 'onsubmit', 'onreset', 'onchange', 'oninput',
            'onkeydown', 'onkeyup', 'onkeypress', 'ondblclick',
            'oncontextmenu', 'ondrag', 'ondrop', 'onscroll'
        ]);

        const nameLower = name.toLowerCase();

        // Block event handlers
        if (dangerousAttributes.has(nameLower) || nameLower.startsWith('on')) {
            console.warn(`[SafeDOM] Blocked dangerous attribute: ${name}`);
            return;
        }

        // Sanitize href/src for javascript: URLs
        if (['href', 'src', 'action', 'formaction'].includes(nameLower)) {
            if (this.isDangerousURL(value)) {
                console.warn(`[SafeDOM] Blocked dangerous URL in ${name}: ${value}`);
                return;
            }
        }

        element.setAttribute(name, value);
    }

    // =====================
    // URL SAFETY
    // =====================

    /**
     * Check for dangerous URL schemes
     */
    static isDangerousURL(url) {
        if (!url || typeof url !== 'string') return true;

        const normalized = url.toLowerCase().trim();
        const dangerousSchemes = [
            'javascript:',
            'data:text/html',
            'vbscript:',
            'file:',
            'blob:'
        ];
        return dangerousSchemes.some(scheme => normalized.startsWith(scheme));
    }

    /**
     * Sanitize URL for safe use
     */
    static sanitizeURL(url) {
        if (!url || typeof url !== 'string') return '#';

        try {
            const parsed = new URL(url);
            if (['http:', 'https:'].includes(parsed.protocol)) {
                return url;
            }
        } catch {
            // Relative URL handling
            if (url.startsWith('/') || url.startsWith('./') || url.startsWith('#')) {
                return url;
            }
        }
        return '#';
    }

    /**
     * Safely create a link element
     */
    static createLink(href, text, newTab = true) {
        const safeHref = this.sanitizeURL(href);
        const link = document.createElement('a');
        link.href = safeHref;
        link.textContent = text;

        if (newTab) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer'; // Prevent tab-nabbing
        }

        return link;
    }

    // =====================
    // HTML ESCAPING
    // =====================

    /**
     * Escape HTML special characters
     */
    static escapeHTML(str) {
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
        return String(str).replace(/[&<>"'`=/]/g, char => escapeMap[char]);
    }

    /**
     * Tagged template for safe HTML strings
     */
    static html(strings, ...values) {
        const escaped = values.map(val => this.escapeHTML(String(val ?? '')));
        return strings.reduce((result, str, i) => {
            return result + str + (escaped[i] || '');
        }, '');
    }

    // =====================
    // LIST RENDERING
    // =====================

    /**
     * Render a list safely
     */
    static renderList(items, container, itemRenderer = null) {
        const fragment = document.createDocumentFragment();
        const ul = document.createElement('ul');

        for (const item of items) {
            const li = document.createElement('li');
            if (itemRenderer) {
                const content = itemRenderer(item);
                if (content instanceof HTMLElement) {
                    li.appendChild(content);
                } else {
                    li.textContent = String(content);
                }
            } else {
                li.textContent = String(item);
            }
            ul.appendChild(li);
        }

        fragment.appendChild(ul);
        container.appendChild(fragment);
        return ul;
    }

    /**
     * Clear element content safely
     */
    static clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}

// Freeze to prevent tampering
Object.freeze(SafeDOM);

export { SafeDOM };
