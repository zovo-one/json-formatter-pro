/**
 * JSON Formatter Pro - Churn Detector
 * Usage decline detection (md-17 Agent 21)
 * 
 * Features:
 * - Usage decline patterns
 * - At-risk user scoring
 * - Proactive intervention triggers
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ChurnDetector {
    constructor() {
        this.THRESHOLDS = {
            inactivityDays: 7,
            usageDeclinePercent: 50,
            errorSpike: 3,
            featureAbandonment: 14
        };
    }

    // =====================
    // RISK ANALYSIS
    // =====================

    async analyzeChurnRisk() {
        const usage = await this.getUsageHistory();
        const signals = [];

        // Check inactivity
        const daysSinceActive = this.getDaysSinceLastUse(usage);
        if (daysSinceActive >= this.THRESHOLDS.inactivityDays) {
            signals.push({
                type: 'inactivity',
                severity: this.getSeverity(daysSinceActive, [7, 14, 30]),
                data: { daysSinceActive }
            });
        }

        // Check usage decline
        const decline = this.calculateUsageDecline(usage);
        if (decline >= this.THRESHOLDS.usageDeclinePercent) {
            signals.push({
                type: 'usage_decline',
                severity: this.getSeverity(decline, [50, 70, 90]),
                data: { declinePercent: decline }
            });
        }

        // Check error frequency
        const errorRate = await this.getErrorRate();
        if (errorRate >= this.THRESHOLDS.errorSpike) {
            signals.push({
                type: 'error_spike',
                severity: 'high',
                data: { errorsPerSession: errorRate }
            });
        }

        // Check feature abandonment
        const abandoned = await this.getAbandonedFeatures();
        if (abandoned.length > 0) {
            signals.push({
                type: 'feature_abandonment',
                severity: 'medium',
                data: { features: abandoned }
            });
        }

        return {
            isAtRisk: signals.length > 0,
            riskScore: this.calculateRiskScore(signals),
            signals,
            tier: this.getRiskTier(this.calculateRiskScore(signals)),
            recommendations: this.getRecommendations(signals)
        };
    }

    // =====================
    // USAGE TRACKING
    // =====================

    async getUsageHistory() {
        const { usageHistory = [] } = await chrome.storage.local.get('usageHistory');
        return usageHistory;
    }

    async trackAction(action = 'general') {
        const today = new Date().toISOString().split('T')[0];
        const { usageHistory = [] } = await chrome.storage.local.get('usageHistory');

        const todayEntry = usageHistory.find(u => u.date === today);
        if (todayEntry) {
            todayEntry.actions++;
            if (!todayEntry.types) todayEntry.types = {};
            todayEntry.types[action] = (todayEntry.types[action] || 0) + 1;
        } else {
            usageHistory.push({
                date: today,
                actions: 1,
                types: { [action]: 1 }
            });
        }

        // Keep last 90 days only
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const filtered = usageHistory.filter(u => new Date(u.date) > cutoff);

        await chrome.storage.local.set({ usageHistory: filtered });
        return filtered;
    }

    getDaysSinceLastUse(usage) {
        if (usage.length === 0) return Infinity;
        const lastUse = new Date(usage[usage.length - 1].date);
        const now = new Date();
        return Math.floor((now - lastUse) / (1000 * 60 * 60 * 24));
    }

    calculateUsageDecline(usage) {
        if (usage.length < 14) return 0;

        const recent = usage.slice(-7);
        const previous = usage.slice(-14, -7);

        const recentAvg = recent.reduce((a, b) => a + b.actions, 0) / 7;
        const previousAvg = previous.reduce((a, b) => a + b.actions, 0) / 7;

        if (previousAvg === 0) return 0;
        return Math.round(((previousAvg - recentAvg) / previousAvg) * 100);
    }

    // =====================
    // ERROR TRACKING
    // =====================

    async getErrorRate() {
        const { errorSummary = {} } = await chrome.storage.local.get('errorSummary');
        const { sessionCount = 1 } = await chrome.storage.local.get('sessionCount');

        const recentErrorCount = errorSummary.last7Days || 0;
        return recentErrorCount / Math.max(sessionCount, 1);
    }

    // =====================
    // FEATURE TRACKING
    // =====================

    async getAbandonedFeatures() {
        const { featureUsage = {} } = await chrome.storage.local.get('featureUsage');
        const abandoned = [];

        for (const [feature, data] of Object.entries(featureUsage)) {
            const daysSinceUsed = this.daysSince(data.lastUsed);
            if (data.usedCount > 3 && daysSinceUsed > this.THRESHOLDS.featureAbandonment) {
                abandoned.push(feature);
            }
        }
        return abandoned;
    }

    async trackFeatureUsage(feature) {
        const { featureUsage = {} } = await chrome.storage.local.get('featureUsage');

        if (!featureUsage[feature]) {
            featureUsage[feature] = { usedCount: 0, firstUsed: Date.now() };
        }

        featureUsage[feature].usedCount++;
        featureUsage[feature].lastUsed = Date.now();

        await chrome.storage.local.set({ featureUsage });
    }

    // =====================
    // SCORING
    // =====================

    getSeverity(value, thresholds) {
        if (value >= thresholds[2]) return 'critical';
        if (value >= thresholds[1]) return 'high';
        if (value >= thresholds[0]) return 'medium';
        return 'low';
    }

    calculateRiskScore(signals) {
        const weights = {
            critical: 40,
            high: 25,
            medium: 15,
            low: 5
        };

        return Math.min(100, signals.reduce((score, signal) => {
            return score + weights[signal.severity];
        }, 0));
    }

    getRiskTier(score) {
        if (score >= 80) return { name: 'critical', color: 'red', action: 'immediate' };
        if (score >= 60) return { name: 'high', color: 'orange', action: 'urgent' };
        if (score >= 40) return { name: 'medium', color: 'yellow', action: 'monitor' };
        if (score >= 20) return { name: 'low', color: 'blue', action: 'nurture' };
        return { name: 'healthy', color: 'green', action: 'maintain' };
    }

    getRecommendations(signals) {
        const recommendations = [];

        for (const signal of signals) {
            switch (signal.type) {
                case 'inactivity':
                    recommendations.push({
                        type: 'reengagement',
                        priority: signal.severity === 'critical' ? 'high' : 'medium',
                        message: 'Send re-engagement notification with new features'
                    });
                    break;
                case 'error_spike':
                    recommendations.push({
                        type: 'support',
                        priority: 'high',
                        message: 'Proactive support outreach to resolve issues'
                    });
                    break;
                case 'usage_decline':
                    recommendations.push({
                        type: 'value_reminder',
                        priority: 'medium',
                        message: 'Show usage statistics and value delivered'
                    });
                    break;
                case 'feature_abandonment':
                    recommendations.push({
                        type: 'education',
                        priority: 'low',
                        message: 'Send feature discovery tips'
                    });
                    break;
            }
        }

        return recommendations;
    }

    // =====================
    // UTILITIES
    // =====================

    daysSince(timestamp) {
        if (!timestamp) return 999;
        return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    }
}

// Export singleton
const churnDetector = new ChurnDetector();
export { churnDetector, ChurnDetector };
