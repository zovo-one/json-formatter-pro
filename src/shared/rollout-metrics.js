/**
 * JSON Formatter Pro - Rollout Metrics
 * Release monitoring and health checks (md-22 Agent 48)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class RolloutMetrics {
    constructor() {
        this.sessionId = crypto.randomUUID();
        this.STORAGE_KEY = 'rolloutMetrics';
    }

    // =====================
    // METRIC RECORDING
    // =====================

    async recordMetric(name, value, metadata = {}) {
        const manifest = chrome.runtime.getManifest();

        const metric = {
            name,
            value,
            version: manifest.version,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            ...metadata
        };

        await this.persistMetric(metric);
        return metric;
    }

    async persistMetric(metric) {
        const { rolloutMetrics = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
        rolloutMetrics.push(metric);

        // Keep last 500 metrics
        const trimmed = rolloutMetrics.slice(-500);
        await chrome.storage.local.set({ [this.STORAGE_KEY]: trimmed });
    }

    // =====================
    // ERROR TRACKING
    // =====================

    async trackError(error, context = {}) {
        return this.recordMetric('error', 1, {
            errorType: error.name || 'Error',
            errorMessage: error.message,
            stack: error.stack?.substring(0, 300),
            ...context
        });
    }

    async trackWarning(message, context = {}) {
        return this.recordMetric('warning', 1, {
            message,
            ...context
        });
    }

    // =====================
    // PERFORMANCE TRACKING
    // =====================

    async trackPerformance(operation, durationMs) {
        return this.recordMetric('performance', durationMs, {
            operation
        });
    }

    async trackOperationStart(operation) {
        const startKey = `perf_start_${operation}`;
        await chrome.storage.local.set({ [startKey]: performance.now() });
    }

    async trackOperationEnd(operation) {
        const startKey = `perf_start_${operation}`;
        const result = await chrome.storage.local.get(startKey);
        const startTime = result[startKey];

        if (startTime) {
            const duration = performance.now() - startTime;
            await chrome.storage.local.remove(startKey);
            return this.trackPerformance(operation, duration);
        }

        return null;
    }

    // =====================
    // FEATURE USAGE
    // =====================

    async trackFeatureUsage(feature) {
        return this.recordMetric('feature_usage', 1, { feature });
    }

    // =====================
    // LIFECYCLE EVENTS
    // =====================

    async trackInstall() {
        return this.recordMetric('lifecycle', 1, { event: 'install' });
    }

    async trackUpdate(fromVersion, toVersion) {
        return this.recordMetric('lifecycle', 1, {
            event: 'update',
            fromVersion,
            toVersion
        });
    }

    async trackSessionStart() {
        return this.recordMetric('lifecycle', 1, { event: 'session_start' });
    }

    // =====================
    // HEALTH ANALYSIS
    // =====================

    async getHealthReport() {
        const { rolloutMetrics = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
        const manifest = chrome.runtime.getManifest();
        const currentVersion = manifest.version;

        // Filter to current version
        const versionMetrics = rolloutMetrics.filter(m => m.version === currentVersion);

        // Calculate metrics
        const errors = versionMetrics.filter(m => m.name === 'error');
        const warnings = versionMetrics.filter(m => m.name === 'warning');
        const perfMetrics = versionMetrics.filter(m => m.name === 'performance');
        const featureUsage = versionMetrics.filter(m => m.name === 'feature_usage');

        const totalSessions = new Set(versionMetrics.map(m => m.sessionId)).size;
        const errorRate = totalSessions > 0 ? errors.length / totalSessions : 0;

        // Performance averages by operation
        const perfByOperation = {};
        for (const metric of perfMetrics) {
            const op = metric.operation;
            if (!perfByOperation[op]) {
                perfByOperation[op] = { total: 0, count: 0 };
            }
            perfByOperation[op].total += metric.value;
            perfByOperation[op].count++;
        }

        const avgPerformance = {};
        for (const [op, data] of Object.entries(perfByOperation)) {
            avgPerformance[op] = Math.round(data.total / data.count);
        }

        // Feature usage counts
        const featureCounts = {};
        for (const metric of featureUsage) {
            const feature = metric.feature;
            featureCounts[feature] = (featureCounts[feature] || 0) + 1;
        }

        return {
            version: currentVersion,
            generatedAt: new Date().toISOString(),
            totalSessions,
            errors: errors.length,
            errorRate: (errorRate * 100).toFixed(2) + '%',
            warnings: warnings.length,
            avgPerformance,
            featureUsage: featureCounts,
            health: this.calculateHealthScore(errorRate, avgPerformance)
        };
    }

    calculateHealthScore(errorRate, avgPerformance) {
        let score = 100;

        // Deduct for errors
        if (errorRate > 0.1) score -= 50;
        else if (errorRate > 0.05) score -= 30;
        else if (errorRate > 0.01) score -= 10;

        // Deduct for slow operations
        const slowOps = Object.values(avgPerformance).filter(ms => ms > 1000);
        score -= slowOps.length * 5;

        score = Math.max(0, Math.min(100, score));

        return {
            score,
            grade: score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'F',
            status: score >= 70 ? 'healthy' : score >= 50 ? 'degraded' : 'critical'
        };
    }

    // =====================
    // CLEANUP
    // =====================

    async clearMetrics() {
        await chrome.storage.local.remove(this.STORAGE_KEY);
    }

    async clearOldMetrics(daysToKeep = 7) {
        const { rolloutMetrics = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
        const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        const recent = rolloutMetrics.filter(m => m.timestamp > cutoff);
        await chrome.storage.local.set({ [this.STORAGE_KEY]: recent });

        return rolloutMetrics.length - recent.length;
    }
}

// Export singleton
const rolloutMetrics = new RolloutMetrics();
export { rolloutMetrics, RolloutMetrics };
