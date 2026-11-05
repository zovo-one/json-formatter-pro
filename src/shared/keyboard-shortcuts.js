/**
 * JSON Formatter Pro - Keyboard Shortcuts
 * Keyboard navigation and shortcuts (md-21 Agent 42)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.descriptions = new Map();
        this.enabled = true;
        this.init();
    }

    // =====================
    // INITIALIZATION
    // =====================

    init() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Don't trigger in input fields unless it's escape
            if (this.isTypingContext(e.target) && e.key !== 'Escape') {
                return;
            }

            const key = this.getKeyCombo(e);
            const handler = this.shortcuts.get(key);

            if (handler) {
                e.preventDefault();
                handler(e);
            }
        });
    }

    isTypingContext(element) {
        const tagName = element.tagName.toLowerCase();
        return tagName === 'input' ||
            tagName === 'textarea' ||
            element.isContentEditable;
    }

    // =====================
    // KEY COMBO PARSING
    // =====================

    getKeyCombo(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('mod');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        parts.push(e.key.toLowerCase());
        return parts.join('+');
    }

    parseCombo(combo) {
        return combo.toLowerCase().split('+').map(part => {
            if (part === 'ctrl' || part === 'cmd' || part === 'meta') return 'mod';
            return part;
        }).sort().join('+');
    }

    // =====================
    // REGISTRATION
    // =====================

    register(combo, handler, description = '') {
        const normalizedCombo = this.parseCombo(combo);
        this.shortcuts.set(normalizedCombo, handler);
        if (description) {
            this.descriptions.set(normalizedCombo, description);
        }
        return this;
    }

    unregister(combo) {
        const normalizedCombo = this.parseCombo(combo);
        this.shortcuts.delete(normalizedCombo);
        this.descriptions.delete(normalizedCombo);
        return this;
    }

    // =====================
    // COMMON SHORTCUTS
    // =====================

    registerDefaults() {
        // Format JSON
        this.register('mod+shift+f', () => {
            document.getElementById('format-btn')?.click();
        }, 'Format JSON');

        // Minify
        this.register('mod+shift+m', () => {
            document.getElementById('minify-btn')?.click();
        }, 'Minify JSON');

        // Copy
        this.register('mod+shift+c', () => {
            document.getElementById('copy-btn')?.click();
        }, 'Copy to clipboard');

        // Clear
        this.register('mod+shift+x', () => {
            document.getElementById('clear-btn')?.click();
        }, 'Clear input');

        // Help
        this.register('?', () => {
            this.showHelp();
        }, 'Show keyboard shortcuts');

        // Escape to close
        this.register('escape', () => {
            window.close?.();
        }, 'Close popup');

        return this;
    }

    // =====================
    // HELP DIALOG
    // =====================

    showHelp() {
        const shortcuts = this.getShortcutsList();

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'keyboard-shortcuts-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'shortcuts-title');

        modal.innerHTML = `
      <div class="shortcuts-content">
        <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
        <button class="close-btn" aria-label="Close">&times;</button>
        <dl class="shortcuts-list">
          ${shortcuts.map(([combo, desc]) => `
            <div class="shortcut-item">
              <dt><kbd>${this.formatCombo(combo)}</kbd></dt>
              <dd>${desc}</dd>
            </div>
          `).join('')}
        </dl>
      </div>
    `;

        document.body.appendChild(modal);

        // Close handlers
        const closeModal = () => modal.remove();
        modal.querySelector('.close-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Focus close button
        modal.querySelector('.close-btn').focus();
    }

    formatCombo(combo) {
        return combo
            .split('+')
            .map(key => {
                if (key === 'mod') return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
                if (key === 'shift') return '⇧';
                if (key === 'alt') return navigator.platform.includes('Mac') ? '⌥' : 'Alt';
                if (key === 'escape') return 'Esc';
                return key.toUpperCase();
            })
            .join(' + ');
    }

    getShortcutsList() {
        return [...this.descriptions.entries()];
    }

    // =====================
    // CONTROL
    // =====================

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    clear() {
        this.shortcuts.clear();
        this.descriptions.clear();
    }
}

// Export singleton
const keyboardShortcuts = new KeyboardShortcuts();
export { keyboardShortcuts, KeyboardShortcuts };
