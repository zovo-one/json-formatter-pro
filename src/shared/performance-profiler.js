/**
 * JSON Formatter Pro - Performance Profiler
 * Operation timing and profiling (md-20 Agent 39)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class PerformanceProfiler {
    constructor() {
        this.timings = new Map();
        this.marks = new Map();
        this.STORAGE_KEY = 'performanceMetrics';
    }

    // =====================
    // TIMING
    // =====================

    /**
     * Start timing an operation
     */
    start(label) {
        this.marks.set(label, performance.now());
    }

    /**
     * End timing and record result
     */
    end(label) {
        const startTime = this.marks.get(label);
        if (!startTime) {
            console.warn(`[Profiler] No start mark for: ${label}`);
            return null;
        }

        const duration = performance.now() - startTime;
        this.marks.delete(label);

        // Record timing
        this.recordTiming(label, duration);

        return duration;
    }

    /**
     * Time an async function
     */
    async time(label, fn) {
        this.start(label);
        try {
            const result = await fn();
            return result;
        } finally {
            this.end(label);
        }
    }

    /**
     * Time a sync function
     */
    timeSync(label, fn) {
        this.start(label);
        try {
            return fn();
        } finally {
            this.end(label);
        }
    }

    // =====================
    // RECORDING
    // =====================

    recordTiming(label, duration) {
        if (!this.timings.has(label)) {
            this.timings.set(label, {
                label,
                count: 0,
                total: 0,
                min: Infinity,
                max: 0,
                samples: []
            });
        }

        const stats = this.timings.get(label);
        stats.count++;
        stats.total += duration;
        stats.min = Math.min(stats.min, duration);
        stats.max = Math.max(stats.max, duration);

        // Keep last 100 samples for percentile calculations
        stats.samples.push(duration);
        if (stats.samples.length > 100) {
            stats.samples.shift();
        }
    }

    // =====================
    // STATISTICS
    // =====================

    getStats(label) {
        const stats = this.timings.get(label);
        if (!stats) return null;

        const sorted = [...stats.samples].sort((a, b) => a - b);

        return {
            label: stats.label,
            count: stats.count,
            average: (stats.total / stats.count).toFixed(2),
            min: stats.min.toFixed(2),
            max: stats.max.toFixed(2),
            p50: this.percentile(sorted, 50).toFixed(2),
            p95: this.percentile(sorted, 95).toFixed(2),
            p99: this.percentile(sorted, 99).toFixed(2)
        };
    }

    getAllStats() {
        const results = {};
        for (const label of this.timings.keys()) {
            results[label] = this.getStats(label);
        }
        return results;
    }

    percentile(sorted, p) {
        if (sorted.length === 0) return 0;
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    // =====================
    // OPERATION TRACKING
    // =====================

    /**
     * Track specific operations for JSON Formatter
     */
    trackOperation(type, inputSize, duration) {
        const key = `op_${type}`;
        this.recordTiming(key, duration);

        // Also track by size bucket
        const sizeBucket = this.getSizeBucket(inputSize);
        const sizeKey = `op_${type}_${sizeBucket}`;
        this.recordTiming(sizeKey, duration);
    }

    getSizeBucket(bytes) {
        if (bytes < 1024) return 'tiny';
        if (bytes < 10 * 1024) return 'small';
        if (bytes < 100 * 1024) return 'medium';
        if (bytes < 1024 * 1024) return 'large';
        return 'huge';
    }

    // =====================
    // BENCHMARKS
    // =====================

    /**
     * Run a benchmark
     */
    async benchmark(label, fn, iterations = 100) {
        const results = [];

        // Warmup
        for (let i = 0; i < 10; i++) {
            await fn();
        }

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            results.push(performance.now() - start);
        }

        const sorted = results.sort((a, b) => a - b);

        return {
            label,
            iterations,
            average: (results.reduce((a, b) => a + b, 0) / iterations).toFixed(3),
            min: sorted[0].toFixed(3),
            max: sorted[sorted.length - 1].toFixed(3),
            p50: this.percentile(sorted, 50).toFixed(3),
            p95: this.percentile(sorted, 95).toFixed(3),
            opsPerSecond: Math.round(1000 / (results.reduce((a, b) => a + b, 0) / iterations))
        };
    }

    // =====================
    // PERSISTENCE
    // =====================

    async persist() {
        const data = {};
        for (const [key, stats] of this.timings) {
            data[key] = {
                ...stats,
                samples: stats.samples.slice(-20) // Only keep recent samples
            };
        }
        await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
    }

    async restore() {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        const data = result[this.STORAGE_KEY] || {};

        for (const [key, stats] of Object.entries(data)) {
            this.timings.set(key, stats);
        }
    }

    // =====================
    // UTILITIES
    // =====================

    clear() {
        this.timings.clear();
        this.marks.clear();
    }

    /**
     * Log slow operations
     */
    logSlowOperations(thresholdMs = 100) {
        const slow = [];
        for (const [label, stats] of this.timings) {
            if (stats.max > thresholdMs) {
                slow.push({
                    label,
                    maxMs: stats.max.toFixed(2),
                    avgMs: (stats.total / stats.count).toFixed(2)
                });
            }
        }
        return slow.sort((a, b) => parseFloat(b.maxMs) - parseFloat(a.maxMs));
    }
}

// Export singleton
const performanceProfiler = new PerformanceProfiler();
export { performanceProfiler, PerformanceProfiler };
