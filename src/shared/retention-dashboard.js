/**
 * JSON Formatter Pro - Retention Dashboard
 * Analytics and metrics (md-17 Agent 25)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class RetentionDashboard {
    // =====================
    // CORE METRICS
    // =====================

    async getRetentionMetrics() {
        const engagement = await this.getEngagementMetrics();
        const usage = await this.getUsageMetrics();
        const features = await this.getFeatureMetrics();
        const health = await this.getHealthScore(engagement, usage, features);

        return {
            engagement,
            usage,
            features,
            health,
            generatedAt: Date.now()
        };
    }

    // =====================
    // ENGAGEMENT METRICS
    // =====================

    async getEngagementMetrics() {
        const { usageHistory = [] } = await chrome.storage.local.get('usageHistory');
        const { streakData = {} } = await chrome.storage.local.get('streakData');
        const { installedAt } = await chrome.storage.local.get('installedAt');

        const now = Date.now();
        const last30Days = usageHistory.filter(u =>
            now - new Date(u.date).getTime() < 30 * 86400000
        );
        const last7Days = usageHistory.filter(u =>
            now - new Date(u.date).getTime() < 7 * 86400000
        );

        return {
            daysActive: {
                total: usageHistory.length,
                last30Days: last30Days.length,
                last7Days: last7Days.length
            },
            streak: {
                current: streakData.currentStreak || 0,
                longest: streakData.longestStreak || 0
            },
            tenure: installedAt
                ? Math.floor((now - installedAt) / 86400000)
                : 0,
            frequency: last7Days.length > 0 ? 'active' :
                last30Days.length > 0 ? 'occasional' : 'dormant'
        };
    }

    // =====================
    // USAGE METRICS
    // =====================

    async getUsageMetrics() {
        const { actionCounts = {} } = await chrome.storage.local.get('actionCounts');
        const { usageHistory = [] } = await chrome.storage.local.get('usageHistory');

        const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0);
        const avgActionsPerDay = usageHistory.length > 0
            ? Math.round(totalActions / usageHistory.length)
            : 0;

        return {
            totalActions,
            avgActionsPerDay,
            byType: actionCounts,
            topAction: this.getTopAction(actionCounts),
            estimatedTimeSaved: totalActions * 2 // 2 minutes per action
        };
    }

    getTopAction(counts) {
        let max = 0;
        let top = null;
        for (const [action, count] of Object.entries(counts)) {
            if (count > max) {
                max = count;
                top = action;
            }
        }
        return { action: top, count: max };
    }

    // =====================
    // FEATURE METRICS
    // =====================

    async getFeatureMetrics() {
        const { featureUsage = {} } = await chrome.storage.local.get('featureUsage');

        const allFeatures = ['format', 'minify', 'validate', 'convert', 'diff', 'tree'];
        const usedFeatures = Object.keys(featureUsage);
        const unusedFeatures = allFeatures.filter(f => !usedFeatures.includes(f));

        return {
            totalAvailable: allFeatures.length,
            totalUsed: usedFeatures.length,
            adoptionRate: Math.round((usedFeatures.length / allFeatures.length) * 100),
            used: usedFeatures,
            unused: unusedFeatures,
            details: featureUsage
        };
    }

    // =====================
    // HEALTH SCORE
    // =====================

    async getHealthScore(engagement, usage, features) {
        let score = 0;
        const maxScore = 100;
        const factors = [];

        // Engagement (30 points max)
        if (engagement.daysActive.last7Days >= 5) {
            score += 30;
            factors.push({ factor: 'engagement', score: 30, status: 'excellent' });
        } else if (engagement.daysActive.last7Days >= 3) {
            score += 20;
            factors.push({ factor: 'engagement', score: 20, status: 'good' });
        } else if (engagement.daysActive.last7Days >= 1) {
            score += 10;
            factors.push({ factor: 'engagement', score: 10, status: 'fair' });
        } else {
            factors.push({ factor: 'engagement', score: 0, status: 'poor' });
        }

        // Usage volume (25 points max)
        if (usage.avgActionsPerDay >= 10) {
            score += 25;
            factors.push({ factor: 'usage', score: 25, status: 'power_user' });
        } else if (usage.avgActionsPerDay >= 5) {
            score += 20;
            factors.push({ factor: 'usage', score: 20, status: 'regular' });
        } else if (usage.avgActionsPerDay >= 1) {
            score += 10;
            factors.push({ factor: 'usage', score: 10, status: 'light' });
        } else {
            factors.push({ factor: 'usage', score: 0, status: 'minimal' });
        }

        // Feature adoption (25 points max)
        if (features.adoptionRate >= 80) {
            score += 25;
            factors.push({ factor: 'features', score: 25, status: 'explorer' });
        } else if (features.adoptionRate >= 50) {
            score += 15;
            factors.push({ factor: 'features', score: 15, status: 'moderate' });
        } else if (features.adoptionRate >= 25) {
            score += 8;
            factors.push({ factor: 'features', score: 8, status: 'basic' });
        } else {
            factors.push({ factor: 'features', score: 0, status: 'limited' });
        }

        // Streak bonus (20 points max)
        if (engagement.streak.current >= 14) {
            score += 20;
            factors.push({ factor: 'streak', score: 20, status: 'dedicated' });
        } else if (engagement.streak.current >= 7) {
            score += 15;
            factors.push({ factor: 'streak', score: 15, status: 'consistent' });
        } else if (engagement.streak.current >= 3) {
            score += 8;
            factors.push({ factor: 'streak', score: 8, status: 'building' });
        } else {
            factors.push({ factor: 'streak', score: 0, status: 'starting' });
        }

        return {
            score: Math.min(score, maxScore),
            grade: this.getGrade(score),
            factors,
            churnRisk: this.getChurnRisk(score)
        };
    }

    getGrade(score) {
        if (score >= 90) return { letter: 'A+', label: 'Excellent' };
        if (score >= 80) return { letter: 'A', label: 'Great' };
        if (score >= 70) return { letter: 'B', label: 'Good' };
        if (score >= 60) return { letter: 'C', label: 'Fair' };
        if (score >= 50) return { letter: 'D', label: 'Needs Attention' };
        return { letter: 'F', label: 'At Risk' };
    }

    getChurnRisk(score) {
        if (score >= 70) return { level: 'low', probability: '< 10%' };
        if (score >= 50) return { level: 'medium', probability: '10-30%' };
        if (score >= 30) return { level: 'high', probability: '30-60%' };
        return { level: 'critical', probability: '> 60%' };
    }

    // =====================
    // SUMMARY
    // =====================

    async getSummary() {
        const metrics = await this.getRetentionMetrics();

        return {
            healthGrade: metrics.health.grade.letter,
            churnRisk: metrics.health.churnRisk.level,
            totalActions: metrics.usage.totalActions,
            activeDays: metrics.engagement.daysActive.total,
            currentStreak: metrics.engagement.streak.current,
            featureAdoption: `${metrics.features.adoptionRate}%`,
            timeSaved: `${metrics.usage.estimatedTimeSaved} minutes`
        };
    }
}

// Export singleton
const retentionDashboard = new RetentionDashboard();
export { retentionDashboard, RetentionDashboard };
