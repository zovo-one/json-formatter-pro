/**
 * JSON Formatter Pro - Cache Manager
 * Intelligent caching with LRU eviction (md-20 Agent 38)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class CacheManager {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 50;
        this.maxAge = options.maxAge || 3600000; // 1 hour
        this.cache = new Map();
        this.accessOrder = [];
        this.STORAGE_KEY = 'cacheData';
    }

    // =====================
    // BASIC OPERATIONS
    // =====================

    /**
     * Set a cache entry
     */
    set(key, value, ttl = this.maxAge) {
        // Evict if at capacity
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }

        const entry = {
            value,
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl,
            accessCount: 0
        };

        this.cache.set(key, entry);
        this.updateAccessOrder(key);

        return this;
    }

    /**
     * Get a cache entry
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check expiration
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }

        // Update access tracking
        entry.accessCount++;
        this.updateAccessOrder(key);

        return entry.value;
    }

    /**
     * Check if key exists and is valid
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Delete a cache entry
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        return deleted;
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    // =====================
    // LRU EVICTION
    // =====================

    updateAccessOrder(key) {
        // Remove from current position
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        // Add to end (most recently used)
        this.accessOrder.push(key);
    }

    evictLRU() {
        while (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
            const lruKey = this.accessOrder.shift();
            this.cache.delete(lruKey);
        }
    }

    /**
     * Evict expired entries
     */
    evictExpired() {
        const now = Date.now();
        let evicted = 0;

        for (const [key, entry] of this.cache) {
            if (entry.expiresAt < now) {
                this.delete(key);
                evicted++;
            }
        }

        return evicted;
    }

    // =====================
    // CACHE HELPERS
    // =====================

    /**
     * Get or compute a value
     */
    async getOrSet(key, computeFn, ttl) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        const value = await computeFn();
        this.set(key, value, ttl);
        return value;
    }

    /**
     * Hash a complex key for caching
     */
    hashKey(input) {
        const str = typeof input === 'string' ? input : JSON.stringify(input);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `cache_${hash}`;
    }

    // =====================
    // PERSISTENCE
    // =====================

    async persist() {
        // Only persist non-function values
        const persistable = {};
        for (const [key, entry] of this.cache) {
            if (typeof entry.value !== 'function') {
                persistable[key] = entry;
            }
        }

        await chrome.storage.local.set({ [this.STORAGE_KEY]: persistable });
    }

    async restore() {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        const data = result[this.STORAGE_KEY] || {};

        const now = Date.now();
        for (const [key, entry] of Object.entries(data)) {
            // Only restore non-expired entries
            if (entry.expiresAt > now) {
                this.cache.set(key, entry);
                this.accessOrder.push(key);
            }
        }
    }

    // =====================
    // STATS
    // =====================

    getStats() {
        const now = Date.now();
        let totalAccessCount = 0;
        let expiredCount = 0;

        for (const entry of this.cache.values()) {
            totalAccessCount += entry.accessCount;
            if (entry.expiresAt < now) expiredCount++;
        }

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilization: ((this.cache.size / this.maxSize) * 100).toFixed(1),
            totalAccesses: totalAccessCount,
            expiredEntries: expiredCount,
            oldestAccess: this.accessOrder[0] || null,
            newestAccess: this.accessOrder[this.accessOrder.length - 1] || null
        };
    }

    // =====================
    // SPECIALIZED CACHES
    // =====================

    /**
     * Create a size-limited cache for JSON strings
     */
    static createJSONCache(maxSizeMB = 10) {
        const maxBytes = maxSizeMB * 1024 * 1024;
        let currentSize = 0;
        const cache = new Map();

        return {
            set(key, json) {
                const size = new Blob([json]).size;

                // Evict until we have room
                while (currentSize + size > maxBytes && cache.size > 0) {
                    const [firstKey, firstEntry] = cache.entries().next().value;
                    currentSize -= firstEntry.size;
                    cache.delete(firstKey);
                }

                cache.set(key, { json, size, accessedAt: Date.now() });
                currentSize += size;
            },

            get(key) {
                const entry = cache.get(key);
                if (entry) {
                    entry.accessedAt = Date.now();
                    return entry.json;
                }
                return null;
            },

            getStats() {
                return {
                    entries: cache.size,
                    usedMB: (currentSize / 1024 / 1024).toFixed(2),
                    maxMB: maxSizeMB
                };
            },

            clear() {
                cache.clear();
                currentSize = 0;
            }
        };
    }
}

// Export singleton
const cacheManager = new CacheManager();
export { cacheManager, CacheManager };
