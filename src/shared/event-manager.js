/**
 * JSON Formatter Pro - Event Manager
 * Event listener tracking and cleanup (md-20 Agent 37)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class EventManager {
    constructor() {
        this.listeners = new Map();
        this.listenerCount = 0;
    }

    // =====================
    // LISTENER MANAGEMENT
    // =====================

    /**
     * Add an event listener with tracking
     */
    add(target, event, handler, options = {}) {
        const id = `${this.getTargetId(target)}-${event}-${this.listenerCount++}`;

        const entry = {
            id,
            target: new WeakRef(target),
            event,
            handler,
            options,
            addedAt: Date.now()
        };

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event).push(entry);
        target.addEventListener(event, handler, options);

        return id;
    }

    /**
     * Remove a specific event listener
     */
    remove(target, event, handler) {
        const listeners = this.listeners.get(event);
        if (!listeners) return false;

        const index = listeners.findIndex(l => {
            const t = l.target.deref();
            return t === target && l.handler === handler;
        });

        if (index !== -1) {
            target.removeEventListener(event, handler);
            listeners.splice(index, 1);
            return true;
        }

        return false;
    }

    /**
     * Remove by ID
     */
    removeById(id) {
        for (const [event, listeners] of this.listeners) {
            const index = listeners.findIndex(l => l.id === id);
            if (index !== -1) {
                const entry = listeners[index];
                const target = entry.target.deref();
                if (target) {
                    target.removeEventListener(event, entry.handler);
                }
                listeners.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    // =====================
    // CLEANUP
    // =====================

    /**
     * Remove all listeners for a specific target
     */
    removeAllForTarget(target) {
        let removed = 0;

        for (const [event, listeners] of this.listeners) {
            for (let i = listeners.length - 1; i >= 0; i--) {
                const t = listeners[i].target.deref();
                if (t === target) {
                    target.removeEventListener(event, listeners[i].handler);
                    listeners.splice(i, 1);
                    removed++;
                }
            }
        }

        return removed;
    }

    /**
     * Remove all listeners for a specific event type
     */
    removeAllForEvent(event) {
        const listeners = this.listeners.get(event);
        if (!listeners) return 0;

        let removed = 0;
        for (const entry of listeners) {
            const target = entry.target.deref();
            if (target) {
                target.removeEventListener(event, entry.handler);
                removed++;
            }
        }

        this.listeners.set(event, []);
        return removed;
    }

    /**
     * Remove ALL listeners (call on unload)
     */
    removeAll() {
        let removed = 0;

        for (const [event, listeners] of this.listeners) {
            for (const entry of listeners) {
                const target = entry.target.deref();
                if (target) {
                    target.removeEventListener(event, entry.handler, entry.options);
                    removed++;
                }
            }
        }

        this.listeners.clear();
        return removed;
    }

    /**
     * Clean up listeners with garbage collected targets
     */
    cleanup() {
        let cleaned = 0;

        for (const [event, listeners] of this.listeners) {
            for (let i = listeners.length - 1; i >= 0; i--) {
                if (listeners[i].target.deref() === undefined) {
                    listeners.splice(i, 1);
                    cleaned++;
                }
            }
        }

        return cleaned;
    }

    // =====================
    // UTILITIES
    // =====================

    getTargetId(target) {
        if (target === window) return 'window';
        if (target === document) return 'document';
        if (target === document.body) return 'body';
        if (target.id) return `#${target.id}`;
        if (target.className) return `.${target.className.split(' ')[0]}`;
        return target.tagName?.toLowerCase() || 'unknown';
    }

    /**
     * Get statistics about tracked listeners
     */
    getStats() {
        const stats = {
            totalActive: 0,
            byEvent: {},
            oldestListener: null
        };

        const now = Date.now();
        let oldestAge = 0;

        for (const [event, listeners] of this.listeners) {
            const activeCount = listeners.filter(l => l.target.deref()).length;
            stats.byEvent[event] = activeCount;
            stats.totalActive += activeCount;

            for (const l of listeners) {
                const age = now - l.addedAt;
                if (age > oldestAge) {
                    oldestAge = age;
                    stats.oldestListener = {
                        event,
                        age: Math.round(age / 1000),
                        target: this.getTargetId(l.target.deref() || {})
                    };
                }
            }
        }

        return stats;
    }

    // =====================
    // DELEGATION
    // =====================

    /**
     * Create a delegated event handler
     */
    delegate(container, event, selector, handler) {
        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, e, target);
            }
        };

        return this.add(container, event, delegatedHandler);
    }
}

// Export singleton
const eventManager = new EventManager();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('unload', () => {
        eventManager.removeAll();
    });
}

export { eventManager, EventManager };
