/**
 * JSON Formatter Pro - Rate Limiter
 * Free tier usage limits (Agent 19)
 * 
 * Features:
 * - Daily/hourly operation limits
 * - Size-based restrictions
 * - Graceful degradation
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class RateLimiter {
    constructor() {
        // Free tier limits
        this.LIMITS = {
            free: {
                operationsPerDay: 50,
                operationsPerHour: 20,
                maxInputSize: 500 * 1024, // 500KB
                maxOutputSize: 500 * 1024
            },
            pro: {
                operationsPerDay: Infinity,
                operationsPerHour: Infinity,
                maxInputSize: 10 * 1024 * 1024, // 10MB
                maxOutputSize: 10 * 1024 * 1024
            }
        };
    }

    // =====================
    // USAGE TRACKING
    // =====================

    async recordOperation(type = 'format') {
        const { rateLimitData = {} } = await chrome.storage.local.get('rateLimitData');

        const now = Date.now();
        const hourKey = this.getHourKey(now);
        const dayKey = this.getDayKey(now);

        // Initialize tracking structures
        if (!rateLimitData.hourly) rateLimitData.hourly = {};
        if (!rateLimitData.daily) rateLimitData.daily = {};

        // Clean old data
        this.cleanOldData(rateLimitData);

        // Record operation
        rateLimitData.hourly[hourKey] = (rateLimitData.hourly[hourKey] || 0) + 1;
        rateLimitData.daily[dayKey] = (rateLimitData.daily[dayKey] || 0) + 1;
        rateLimitData.lastOperation = now;
        rateLimitData.totalOperations = (rateLimitData.totalOperations || 0) + 1;

        await chrome.storage.local.set({ rateLimitData });

        return this.getUsageStats();
    }

    async getUsageStats() {
        const { rateLimitData = {} } = await chrome.storage.local.get('rateLimitData');
        const tier = await this.getUserTier();
        const limits = this.LIMITS[tier];

        const now = Date.now();
        const hourKey = this.getHourKey(now);
        const dayKey = this.getDayKey(now);

        const hourlyUsage = rateLimitData.hourly?.[hourKey] || 0;
        const dailyUsage = rateLimitData.daily?.[dayKey] || 0;

        return {
            tier,
            hourly: {
                used: hourlyUsage,
                limit: limits.operationsPerHour,
                remaining: Math.max(0, limits.operationsPerHour - hourlyUsage),
                percentUsed: limits.operationsPerHour === Infinity ? 0 :
                    Math.round((hourlyUsage / limits.operationsPerHour) * 100)
            },
            daily: {
                used: dailyUsage,
                limit: limits.operationsPerDay,
                remaining: Math.max(0, limits.operationsPerDay - dailyUsage),
                percentUsed: limits.operationsPerDay === Infinity ? 0 :
                    Math.round((dailyUsage / limits.operationsPerDay) * 100)
            },
            maxInputSize: limits.maxInputSize,
            maxOutputSize: limits.maxOutputSize,
            totalOperations: rateLimitData.totalOperations || 0
        };
    }

    // =====================
    // LIMIT CHECKS
    // =====================

    async canPerformOperation() {
        const stats = await this.getUsageStats();

        // Pro users always allowed
        if (stats.tier === 'pro') {
            return { allowed: true, reason: null };
        }

        // Check hourly limit
        if (stats.hourly.remaining <= 0) {
            return {
                allowed: false,
                reason: 'hourly_limit',
                message: 'Hourly limit reached. Upgrade to Pro for unlimited operations.',
                resetIn: this.getMinutesUntilNextHour()
            };
        }

        // Check daily limit
        if (stats.daily.remaining <= 0) {
            return {
                allowed: false,
                reason: 'daily_limit',
                message: 'Daily limit reached. Upgrade to Pro for unlimited operations.',
                resetIn: this.getMinutesUntilMidnight()
            };
        }

        // Check if approaching limit (warning)
        if (stats.daily.remaining <= 5) {
            return {
                allowed: true,
                warning: true,
                message: `Only ${stats.daily.remaining} operations left today.`
            };
        }

        return { allowed: true, reason: null };
    }

    async checkInputSize(input) {
        const stats = await this.getUsageStats();
        const inputSize = new Blob([input]).size;

        if (inputSize > stats.maxInputSize) {
            return {
                allowed: false,
                reason: 'size_limit',
                message: `Input exceeds ${this.formatSize(stats.maxInputSize)} limit. Upgrade to Pro for larger files.`,
                inputSize,
                limit: stats.maxInputSize
            };
        }

        return { allowed: true, inputSize };
    }

    // =====================
    // USER TIER
    // =====================

    async getUserTier() {
        const { subscription = {} } = await chrome.storage.local.get('subscription');

        if (subscription.tier === 'pro' && subscription.expiresAt > Date.now()) {
            return 'pro';
        }

        return 'free';
    }

    // =====================
    // UTILITIES
    // =====================

    getHourKey(timestamp) {
        const d = new Date(timestamp);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    }

    getDayKey(timestamp) {
        const d = new Date(timestamp);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }

    cleanOldData(data) {
        const now = Date.now();
        const hourAgo = now - 3600000;
        const dayAgo = now - 86400000;

        // Clean hourly data older than 2 hours
        if (data.hourly) {
            for (const key of Object.keys(data.hourly)) {
                const keyTime = this.keyToTime(key);
                if (keyTime < hourAgo) {
                    delete data.hourly[key];
                }
            }
        }

        // Clean daily data older than 2 days
        if (data.daily) {
            for (const key of Object.keys(data.daily)) {
                const keyTime = this.keyToTime(key);
                if (keyTime < dayAgo) {
                    delete data.daily[key];
                }
            }
        }
    }

    keyToTime(key) {
        const parts = key.split('-').map(Number);
        if (parts.length === 4) {
            return new Date(parts[0], parts[1], parts[2], parts[3]).getTime();
        }
        return new Date(parts[0], parts[1], parts[2]).getTime();
    }

    getMinutesUntilNextHour() {
        const now = new Date();
        return 60 - now.getMinutes();
    }

    getMinutesUntilMidnight() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return Math.ceil((midnight - now) / 60000);
    }

    formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

// Export singleton
const rateLimiter = new RateLimiter();
export { rateLimiter, RateLimiter };
