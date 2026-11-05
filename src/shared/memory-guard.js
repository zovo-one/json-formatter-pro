/**
 * JSON Formatter Pro - Deep Debug Agent 51
 * Memory Leak Prevention and Circular Reference Detection
 * 
 * Top 1% Edge Cases:
 * - Circular reference detection in JSON
 * - WeakRef for DOM element caching
 * - Event listener tracking and cleanup
 * - Timer/interval management
 * - Blob URL revocation
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class MemoryGuard {
    constructor() {
        this.eventListeners = new Map();
        this.timers = new Set();
        this.blobUrls = new Set();
        this.elementRefs = new WeakMap();
    }

    // =====================
    // CIRCULAR REFERENCE DETECTION
    // =====================

    /**
     * Check if object has circular references
     * CRITICAL: JSON.stringify will throw on circular refs
     */
    hasCircularReference(obj) {
        const seen = new WeakSet();

        const detect = (value) => {
            if (value === null || typeof value !== 'object') {
                return false;
            }

            if (seen.has(value)) {
                return true;
            }

            seen.add(value);

            if (Array.isArray(value)) {
                return value.some(item => detect(item));
            }

            return Object.values(value).some(v => detect(v));
        };

        return detect(obj);
    }

    /**
     * Safe stringify that handles circular references
     */
    safeStringify(obj, indent = 2) {
        const seen = new WeakSet();

        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular Reference]';
                }
                seen.add(value);
            }
            return value;
        }, indent);
    }

    /**
     * Clone object breaking circular references
     */
    safeClone(obj, maxDepth = 50) {
        const seen = new WeakMap();

        const clone = (value, depth = 0) => {
            if (depth > maxDepth) {
                return '[Max Depth Exceeded]';
            }

            if (value === null || typeof value !== 'object') {
                return value;
            }

            if (seen.has(value)) {
                return '[Circular Reference]';
            }

            seen.set(value, true);

            if (Array.isArray(value)) {
                return value.map(item => clone(item, depth + 1));
            }

            const result = {};
            for (const [k, v] of Object.entries(value)) {
                result[k] = clone(v, depth + 1);
            }
            return result;
        };

        return clone(obj);
    }

    // =====================
    // EVENT LISTENER MANAGEMENT
    // =====================

    /**
     * Track addEventListener calls for cleanup
     */
    trackListener(element, event, handler, options) {
        const key = this.getElementKey(element);

        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }

        this.eventListeners.get(key).push({ event, handler, options });
        element.addEventListener(event, handler, options);
    }

    /**
     * Remove all listeners from an element
     */
    cleanupListeners(element) {
        const key = this.getElementKey(element);
        const listeners = this.eventListeners.get(key);

        if (listeners) {
            for (const { event, handler, options } of listeners) {
                element.removeEventListener(event, handler, options);
            }
            this.eventListeners.delete(key);
        }
    }

    /**
     * Cleanup all tracked listeners
     */
    cleanupAllListeners() {
        for (const [key, listeners] of this.eventListeners) {
            const element = document.querySelector(`[data-mem-key="${key}"]`);
            if (element) {
                for (const { event, handler, options } of listeners) {
                    element.removeEventListener(event, handler, options);
                }
            }
        }
        this.eventListeners.clear();
    }

    getElementKey(element) {
        if (!element.dataset.memKey) {
            element.dataset.memKey = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return element.dataset.memKey;
    }

    // =====================
    // TIMER MANAGEMENT
    // =====================

    /**
     * Track setTimeout for cleanup
     */
    setTimeout(callback, delay) {
        const id = window.setTimeout(() => {
            this.timers.delete(id);
            callback();
        }, delay);
        this.timers.add(id);
        return id;
    }

    /**
     * Track setInterval for cleanup
     */
    setInterval(callback, delay) {
        const id = window.setInterval(callback, delay);
        this.timers.add(id);
        return id;
    }

    /**
     * Clear specific timer
     */
    clearTimer(id) {
        window.clearTimeout(id);
        window.clearInterval(id);
        this.timers.delete(id);
    }

    /**
     * Clear all tracked timers
     */
    clearAllTimers() {
        for (const id of this.timers) {
            window.clearTimeout(id);
            window.clearInterval(id);
        }
        this.timers.clear();
    }

    // =====================
    // BLOB URL MANAGEMENT
    // =====================

    /**
     * Create tracked Blob URL
     */
    createObjectURL(blob) {
        const url = URL.createObjectURL(blob);
        this.blobUrls.add(url);
        return url;
    }

    /**
     * Revoke specific Blob URL
     */
    revokeObjectURL(url) {
        URL.revokeObjectURL(url);
        this.blobUrls.delete(url);
    }

    /**
     * Revoke all Blob URLs
     */
    revokeAllObjectURLs() {
        for (const url of this.blobUrls) {
            URL.revokeObjectURL(url);
        }
        this.blobUrls.clear();
    }

    // =====================
    // DOM ELEMENT CACHING
    // =====================

    /**
     * Cache element with WeakRef to allow GC
     */
    cacheElement(key, element) {
        this.elementRefs.set(key, new WeakRef(element));
    }

    /**
     * Get cached element (may return undefined if GC'd)
     */
    getCachedElement(key) {
        const ref = this.elementRefs.get(key);
        return ref?.deref();
    }

    // =====================
    // FULL CLEANUP
    // =====================

    /**
     * Complete memory cleanup for page unload
     */
    destroy() {
        this.cleanupAllListeners();
        this.clearAllTimers();
        this.revokeAllObjectURLs();
    }

    // =====================
    // MEMORY ANALYSIS
    // =====================

    /**
     * Get memory usage report
     */
    getMemoryReport() {
        return {
            eventListeners: this.eventListeners.size,
            activeTimers: this.timers.size,
            blobUrls: this.blobUrls.size,
            heapUsed: (performance.memory?.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            heapTotal: (performance.memory?.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB'
        };
    }
}

// Auto-cleanup on page unload
const memoryGuard = new MemoryGuard();
window.addEventListener('beforeunload', () => memoryGuard.destroy());

export { memoryGuard, MemoryGuard };
