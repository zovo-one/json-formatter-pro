/**
 * JSON Formatter Pro - Live Region
 * Screen reader announcements (md-21 Agent 43)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class LiveRegion {
    constructor(options = {}) {
        this.politeness = options.politeness || 'polite';
        this.element = null;
        this.queue = [];
        this.processing = false;
    }

    // =====================
    // INITIALIZATION
    // =====================

    init() {
        if (this.element) return this.element;

        this.element = document.createElement('div');
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-live', this.politeness);
        this.element.setAttribute('aria-atomic', 'true');
        this.element.className = 'sr-only';

        // Visually hidden but accessible
        Object.assign(this.element.style, {
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0'
        });

        document.body.appendChild(this.element);
        return this.element;
    }

    // =====================
    // ANNOUNCEMENTS
    // =====================

    announce(message, priority = 'polite') {
        if (!this.element) this.init();

        // Update politeness if needed
        if (priority !== this.element.getAttribute('aria-live')) {
            this.element.setAttribute('aria-live', priority);
        }

        // Queue the message
        this.queue.push(message);
        this.processQueue();
    }

    announcePolite(message) {
        this.announce(message, 'polite');
    }

    announceAssertive(message) {
        this.announce(message, 'assertive');
    }

    processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const message = this.queue.shift();

        // Clear first, then set after a frame
        this.element.textContent = '';

        requestAnimationFrame(() => {
            this.element.textContent = message;

            // Allow next message after delay
            setTimeout(() => {
                this.processing = false;
                this.processQueue();
            }, 500);
        });
    }

    clear() {
        if (this.element) {
            this.element.textContent = '';
        }
        this.queue = [];
        this.processing = false;
    }

    // =====================
    // STATE ANNOUNCEMENTS
    // =====================

    announceToggle(featureName, isEnabled) {
        const state = isEnabled ? 'enabled' : 'disabled';
        this.announce(`${featureName} ${state}`);
    }

    announceLoading(action = 'Loading') {
        this.announce(`${action}...`);
    }

    announceComplete(action, result = '') {
        this.announce(`${action} complete. ${result}`.trim());
    }

    announceError(message) {
        this.announceAssertive(`Error: ${message}`);
    }

    announceSuccess(message) {
        this.announce(message);
    }

    announceCount(itemType, count) {
        const unit = count === 1 ? itemType.replace(/s$/, '') : itemType;
        this.announce(`${count} ${unit}`);
    }

    // =====================
    // CLEANUP
    // =====================

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.queue = [];
    }
}

// =====================
// STATE ANNOUNCER
// =====================

class StateAnnouncer {
    constructor() {
        this.liveRegion = new LiveRegion();
        this.liveRegion.init();
    }

    // Form states
    fieldError(fieldName, errorMessage) {
        this.liveRegion.announceAssertive(`Error in ${fieldName}: ${errorMessage}`);
    }

    formSuccess(message = 'Form submitted successfully') {
        this.liveRegion.announcePolite(message);
    }

    // Loading states
    loadingStart(action) {
        this.liveRegion.announcePolite(`${action}...`);
    }

    loadingEnd(action, result) {
        this.liveRegion.announcePolite(`${action} complete. ${result}`);
    }

    // Navigation
    pageChange(pageName) {
        this.liveRegion.announcePolite(`Navigated to ${pageName}`);
    }

    // Content updates
    contentAdded(description) {
        this.liveRegion.announcePolite(description);
    }

    contentRemoved(description) {
        this.liveRegion.announcePolite(description);
    }

    // Status
    statusChange(newStatus) {
        this.liveRegion.announcePolite(newStatus);
    }
}

// Export singleton
const liveRegion = new LiveRegion();
const stateAnnouncer = new StateAnnouncer();

export { liveRegion, stateAnnouncer, LiveRegion, StateAnnouncer };
