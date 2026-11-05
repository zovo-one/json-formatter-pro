/**
 * JSON Formatter Pro - Performance Monitor
 * Memory and CPU tracking (Agent 11)
 * 
 * Features:
 * - Memory usage sampling
 * - Memory leak detection
 * - Operation timing
 * - Startup performance tracking
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class PerformanceMonitor {
    constructor() {
        this.samples = [];
        this.maxSamples = 60;
        this.operations = [];
        this.startTime = Date.now();

        this.init();
    }

    init() {
        // Track startup time
        this.mark('service_worker_init');

        // Set up periodic memory check
        chrome.alarms.create('perf-check', { periodInMinutes: 1 });
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'perf-check') {
                this.measureMemory();
            }
        });

        console.log('[PerformanceMonitor] Initialized');
    }

    mark(name) {
        const mark = {
            name,
            timestamp: Date.now(),
            sinceStart: Date.now() - this.startTime
        };

        this.operations.push(mark);

        // Keep limited
        if (this.operations.length > 100) {
            this.operations.shift();
        }

        return mark;
    }

    async measureMemory() {
        try {
            // performance.memory is limited but useful when available
            if (typeof performance !== 'undefined' && performance.memory) {
                const sample = {
                    timestamp: Date.now(),
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };

                this.samples.push(sample);

                if (this.samples.length > this.maxSamples) {
                    this.samples.shift();
                }

                // Check for memory issues
                const usedMB = Math.round(sample.usedJSHeapSize / 1024 / 1024);
                if (usedMB > 50) {
                    console.warn('[PerformanceMonitor] High memory usage:', usedMB, 'MB');
                }
            }
        } catch (e) {
            // Memory API not available in all contexts
        }
    }

    // Measure execution time of a function
    time(label, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;

        this.operations.push({
            type: 'timing',
            label,
            duration,
            timestamp: Date.now()
        });

        if (duration > 100) {
            console.warn(`[PerformanceMonitor] Slow operation: ${label} took ${duration.toFixed(2)}ms`);
        }

        return result;
    }

    // Async version
    async timeAsync(label, fn) {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;

        this.operations.push({
            type: 'timing_async',
            label,
            duration,
            timestamp: Date.now()
        });

        if (duration > 200) {
            console.warn(`[PerformanceMonitor] Slow async operation: ${label} took ${duration.toFixed(2)}ms`);
        }

        return result;
    }

    // Get performance summary
    getStats() {
        const latestMemory = this.samples[this.samples.length - 1];
        const timings = this.operations.filter(op => op.type?.startsWith('timing'));

        // Calculate average timing by label
        const avgByLabel = {};
        timings.forEach(t => {
            if (!avgByLabel[t.label]) {
                avgByLabel[t.label] = { total: 0, count: 0 };
            }
            avgByLabel[t.label].total += t.duration;
            avgByLabel[t.label].count++;
        });

        for (const label in avgByLabel) {
            avgByLabel[label].avg = avgByLabel[label].total / avgByLabel[label].count;
        }

        return {
            memory: latestMemory ? {
                usedMB: Math.round(latestMemory.usedJSHeapSize / 1024 / 1024),
                totalMB: Math.round(latestMemory.totalJSHeapSize / 1024 / 1024)
            } : null,
            timings: avgByLabel,
            sampleCount: this.samples.length,
            uptime: Date.now() - this.startTime
        };
    }

    // Mark startup complete
    startupComplete() {
        const mark = this.mark('startup_complete');
        console.log(`[PerformanceMonitor] Startup complete in ${mark.sinceStart}ms`);
        return mark;
    }
}

// Export singleton
const perfMonitor = new PerformanceMonitor();
export { perfMonitor, PerformanceMonitor };
