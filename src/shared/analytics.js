/**
 * Zovo Analytics - Local Only
 * Usage tracking with zero external requests
 * 
 * @author Zovo (https://zovo.one)
 */

// Check if Chrome storage API is available
const isAnalyticsStorageAvailable = () => {
    return typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.local;
};

const ZovoAnalytics = {
    extensionId: 'json-formatter-pro',

    /**
     * Track an event (stored locally only)
     */
    async track(eventName, properties = {}) {
        if (!isAnalyticsStorageAvailable()) {
            return;
        }
        try {
            const { analytics = [] } = await chrome.storage.local.get('analytics');

            analytics.push({
                event: eventName,
                properties,
                extension: this.extensionId,
                timestamp: Date.now()
            });

            // Keep only last 100 events
            if (analytics.length > 100) {
                analytics.shift();
            }

            await chrome.storage.local.set({ analytics });
        } catch (error) {
            // Silently fail in non-extension contexts
        }
    },

    /**
     * Get usage statistics
     */
    async getUsageStats() {
        if (!isAnalyticsStorageAvailable()) {
            return { total: 0, today: 0, thisWeek: 0 };
        }
        try {
            const { analytics = [] } = await chrome.storage.local.get('analytics');

            const now = Date.now();
            const dayAgo = now - 24 * 60 * 60 * 1000;
            const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

            return {
                total: analytics.length,
                today: analytics.filter(e => e.timestamp > dayAgo).length,
                thisWeek: analytics.filter(e => e.timestamp > weekAgo).length
            };
        } catch (error) {
            return { total: 0, today: 0, thisWeek: 0 };
        }
    },

    /**
     * Get days since install
     */
    async getDaysSinceInstall() {
        if (!isAnalyticsStorageAvailable()) {
            return 0;
        }
        try {
            const { installedAt } = await chrome.storage.local.get('installedAt');
            if (!installedAt) return 0;
            return Math.floor((Date.now() - installedAt) / (24 * 60 * 60 * 1000));
        } catch (error) {
            return 0;
        }
    },

    /**
     * Increment usage count
     */
    async incrementUsage() {
        if (!isAnalyticsStorageAvailable()) {
            return 0;
        }
        try {
            const { usageCount = 0 } = await chrome.storage.local.get('usageCount');
            await chrome.storage.local.set({
                usageCount: usageCount + 1,
                lastUsedAt: Date.now()
            });
            return usageCount + 1;
        } catch (error) {
            return 0;
        }
    },

    /**
     * Get user engagement level
     */
    async getEngagementLevel() {
        if (!isAnalyticsStorageAvailable()) {
            return 'new';
        }
        try {
            const { usageCount = 0 } = await chrome.storage.local.get('usageCount');
            const daysSinceInstall = await this.getDaysSinceInstall();

            if (usageCount >= 50) return 'power_user';
            if (usageCount >= 20) return 'active';
            if (usageCount >= 5) return 'engaged';
            if (daysSinceInstall >= 3) return 'returning';
            return 'new';
        } catch (error) {
            return 'new';
        }
    },

    /**
     * Track specific actions for JSON Formatter
     */
    async trackFormat() { await this.track('format'); await this.incrementUsage(); },
    async trackMinify() { await this.track('minify'); await this.incrementUsage(); },
    async trackValidate() { await this.track('validate'); await this.incrementUsage(); },
    async trackCopy() { await this.track('copy'); },
    async trackDownload() { await this.track('download'); },
    async trackYAMLConvert() { await this.track('yaml_convert'); await this.incrementUsage(); },
    async trackCSVExport() { await this.track('csv_export'); await this.incrementUsage(); },
    async trackTreeView() { await this.track('tree_view'); }
};

// Export for use
if (typeof window !== 'undefined') {
    window.ZovoAnalytics = ZovoAnalytics;
}
