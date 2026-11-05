/**
 * JSON Formatter Pro - Focus Manager
 * Focus management and navigation (md-21 Agent 41)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class FocusManager {
    constructor(container = document.body) {
        this.container = container;
        this.focusableSelector = [
            'button:not([disabled])',
            'a[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
    }

    // =====================
    // FOCUSABLE ELEMENTS
    // =====================

    getFocusableElements() {
        return [...this.container.querySelectorAll(this.focusableSelector)]
            .filter(el => this.isVisible(el));
    }

    isVisible(element) {
        return element.offsetParent !== null &&
            !element.hidden &&
            getComputedStyle(element).visibility !== 'hidden';
    }

    getFirstFocusable() {
        return this.getFocusableElements()[0] || null;
    }

    getLastFocusable() {
        const elements = this.getFocusableElements();
        return elements[elements.length - 1] || null;
    }

    // =====================
    // FOCUS ACTIONS
    // =====================

    focusFirst() {
        const first = this.getFirstFocusable();
        if (first) {
            first.focus();
            return true;
        }
        return false;
    }

    focusLast() {
        const last = this.getLastFocusable();
        if (last) {
            last.focus();
            return true;
        }
        return false;
    }

    focusNext() {
        const elements = this.getFocusableElements();
        const currentIndex = elements.indexOf(document.activeElement);

        if (currentIndex < elements.length - 1) {
            elements[currentIndex + 1].focus();
            return true;
        }
        return false;
    }

    focusPrevious() {
        const elements = this.getFocusableElements();
        const currentIndex = elements.indexOf(document.activeElement);

        if (currentIndex > 0) {
            elements[currentIndex - 1].focus();
            return true;
        }
        return false;
    }

    // =====================
    // FOCUS BY SELECTOR
    // =====================

    focusBySelector(selector) {
        const element = this.container.querySelector(selector);
        if (element && this.isVisible(element)) {
            element.focus();
            return true;
        }
        return false;
    }

    focusById(id) {
        return this.focusBySelector(`#${id}`);
    }

    // =====================
    // FOCUS RESTORATION
    // =====================

    saveFocus() {
        this.savedFocus = document.activeElement;
    }

    restoreFocus() {
        if (this.savedFocus && this.savedFocus.focus) {
            this.savedFocus.focus();
            this.savedFocus = null;
            return true;
        }
        return false;
    }

    // =====================
    // CONTAINER MANAGEMENT
    // =====================

    setContainer(container) {
        this.container = container;
    }

    contains(element) {
        return this.container.contains(element);
    }

    isWithinContainer() {
        return this.contains(document.activeElement);
    }
}

// =====================
// FOCUS TRAP
// =====================

class FocusTrap {
    constructor(element) {
        this.element = element;
        this.focusManager = new FocusManager(element);
        this.previouslyFocused = null;
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.active = false;
    }

    activate() {
        if (this.active) return;

        this.previouslyFocused = document.activeElement;
        this.element.addEventListener('keydown', this.handleKeyDown);
        this.focusManager.focusFirst();
        this.active = true;
    }

    deactivate() {
        if (!this.active) return;

        this.element.removeEventListener('keydown', this.handleKeyDown);

        if (this.previouslyFocused && this.previouslyFocused.focus) {
            this.previouslyFocused.focus();
        }

        this.active = false;
    }

    handleKeyDown(e) {
        if (e.key !== 'Tab') return;

        const focusables = this.focusManager.getFocusableElements();
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
}

// Export
export { FocusManager, FocusTrap };
