/**
 * JSON Formatter Pro - Memory Monitor
 * Memory leak detection and management (md-20 Agent 36)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class MemoryMonitor {
    constructor() {
        this.snapshots = [];
        this.leakThreshold = 10 * 1024 * 1024; // 10MB growth = potential leak
        this.interval = null;
        this.STORAGE_KEY = 'memorySnapshots';
    }

    // =====================
    // SNAPSHOT MANAGEMENT
    // =====================

    async takeSnapshot() {
        if (typeof performance === 'undefined' || !performance.memory) {
            return this.estimateMemoryUsage();
        }

        const snapshot = {
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };

        this.snapshots.push(snapshot);

        // Keep last 100 snapshots
        if (this.snapshots.length > 100) {
            this.snapshots.shift();
        }

        // Persist for cross-session analysis
        await this.persistSnapshots();

        return snapshot;
    }

    async estimateMemoryUsage() {
        // Fallback for non-Chrome or restricted contexts
        const storageStats = await this.getStorageUsage();

        return {
            timestamp: Date.now(),
            storageUsed: storageStats.used,
            storageQuota: storageStats.quota,
            estimated: true
        };
    }

    async getStorageUsage() {
        try {
            const local = await chrome.storage.local.getBytesInUse(null);
            const sync = await chrome.storage.sync.getBytesInUse(null);

            return {
                used: local + sync,
                quota: chrome.storage.local.QUOTA_BYTES || 5242880,
                local,
                sync
            };
        } catch (e) {
            return { used: 0, quota: 5242880, local: 0, sync: 0 };
        }
    }

    // =====================
    // LEAK DETECTION
    // =====================

    detectLeak() {
        if (this.snapshots.length < 10) {
            return { detected: false, reason: 'insufficient_data' };
        }

        const recent = this.snapshots.slice(-10);

        // Check for memory API snapshots
        const hasMemoryAPI = recent[0].usedJSHeapSize !== undefined;

        if (!hasMemoryAPI) {
            return { detected: false, reason: 'memory_api_unavailable' };
        }

        const oldest = recent[0].usedJSHeapSize;
        const newest = recent[recent.length - 1].usedJSHeapSize;
        const growth = newest - oldest;

        // Check for consistent growth (leak pattern)
        const isGrowing = recent.every((s, i) => {
            if (i === 0) return true;
            return s.usedJSHeapSize >= recent[i - 1].usedJSHeapSize * 0.95;
        });

        if (growth > this.leakThreshold && isGrowing) {
            return {
                detected: true,
                growth,
                growthMB: (growth / 1024 / 1024).toFixed(2),
                trend: 'consistently_increasing',
                severity: growth > this.leakThreshold * 2 ? 'critical' : 'warning'
            };
        }

        return {
            detected: false,
            growth,
            growthMB: (growth / 1024 / 1024).toFixed(2)
        };
    }

    // =====================
    // MONITORING
    // =====================

    startMonitoring(intervalMs = 60000) {
        if (this.interval) {
            this.stopMonitoring();
        }

        this.interval = setInterval(async () => {
            await this.takeSnapshot();
            const leak = this.detectLeak();

            if (leak?.detected) {
                console.warn('[MemoryMonitor] Potential memory leak detected:', leak);
                await this.logLeakEvent(leak);
            }
        }, intervalMs);

        // Take initial snapshot
        this.takeSnapshot();
    }

    stopMonitoring() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async logLeakEvent(leak) {
        const { memoryLeakEvents = [] } = await chrome.storage.local.get('memoryLeakEvents');
        memoryLeakEvents.push({
            ...leak,
            timestamp: Date.now()
        });

        // Keep last 20 events
        const trimmed = memoryLeakEvents.slice(-20);
        await chrome.storage.local.set({ memoryLeakEvents: trimmed });
    }

    // =====================
    // PERSISTENCE
    // =====================

    async persistSnapshots() {
        // Only store last 20 for persistence
        const toStore = this.snapshots.slice(-20);
        await chrome.storage.local.set({ [this.STORAGE_KEY]: toStore });
    }

    async loadSnapshots() {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        this.snapshots = result[this.STORAGE_KEY] || [];
    }

    // =====================
    // REPORTS
    // =====================

    async getReport() {
        await this.loadSnapshots();
        const leak = this.detectLeak();
        const storage = await this.getStorageUsage();

        const latest = this.snapshots[this.snapshots.length - 1];

        return {
            currentUsage: latest ? {
                heapMB: latest.usedJSHeapSize
                    ? (latest.usedJSHeapSize / 1024 / 1024).toFixed(2)
                    : 'N/A',
                storageMB: (storage.used / 1024 / 1024).toFixed(2),
                storagePercent: ((storage.used / storage.quota) * 100).toFixed(1)
            } : null,
            leakAnalysis: leak,
            snapshotCount: this.snapshots.length,
            monitoringActive: this.interval !== null
        };
    }

    async clearData() {
        this.snapshots = [];
        await chrome.storage.local.remove([this.STORAGE_KEY, 'memoryLeakEvents']);
    }
}

// Export singleton
const memoryMonitor = new MemoryMonitor();
export { memoryMonitor, MemoryMonitor };
