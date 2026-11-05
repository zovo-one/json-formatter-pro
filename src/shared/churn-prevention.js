/**
 * JSON Formatter Pro - Churn Prevention System
 * Re-engagement and retention (Agent 17)
 * 
 * Features:
 * - Usage tracking
 * - Inactivity detection
 * - Win-back campaigns
 * - Pro subscription reminders
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ChurnPreventionSystem {
    constructor() {
        this.INACTIVITY_DAYS = 7;
        this.WIN_BACK_DAYS = 14;
        this.init();
    }

    async init() {
        // Set up periodic check via alarms
        chrome.alarms.create('churn-check', { periodInMinutes: 60 * 6 }); // Every 6 hours

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'churn-check') {
                this.checkEngagement();
            }
        });
    }

    // =====================
    // USAGE TRACKING
    // =====================

    async recordActivity(action = 'general') {
        const { engagementData = {} } = await chrome.storage.local.get('engagementData');

        engagementData.lastActive = Date.now();
        engagementData.sessionCount = (engagementData.sessionCount || 0) + 1;
        engagementData.totalActions = (engagementData.totalActions || 0) + 1;

        // Track daily active
        const today = new Date().toISOString().split('T')[0];
        if (!engagementData.activeDays) engagementData.activeDays = [];
        if (!engagementData.activeDays.includes(today)) {
            engagementData.activeDays.push(today);
            // Keep last 30 days only
            engagementData.activeDays = engagementData.activeDays.slice(-30);
        }

        // Track by action type
        if (!engagementData.actionCounts) engagementData.actionCounts = {};
        engagementData.actionCounts[action] = (engagementData.actionCounts[action] || 0) + 1;

        await chrome.storage.local.set({ engagementData });
        return engagementData;
    }

    async getEngagementScore() {
        const { engagementData = {} } = await chrome.storage.local.get('engagementData');

        const daysSinceActive = this.daysSince(engagementData.lastActive);
        const activeDaysCount = engagementData.activeDays?.length || 0;
        const totalActions = engagementData.totalActions || 0;

        // Scoring: 0-100
        let score = 100;

        // Deduct for inactivity
        score -= Math.min(daysSinceActive * 5, 50);

        // Boost for consistent usage
        score += Math.min(activeDaysCount * 2, 30);

        // Boost for action count
        score += Math.min(Math.floor(totalActions / 10), 20);

        return Math.max(0, Math.min(100, score));
    }

    // =====================
    // ENGAGEMENT CHECKS
    // =====================

    async checkEngagement() {
        const { engagementData = {} } = await chrome.storage.local.get('engagementData');
        const daysSinceActive = this.daysSince(engagementData.lastActive);

        // User going inactive
        if (daysSinceActive >= this.INACTIVITY_DAYS && daysSinceActive < this.WIN_BACK_DAYS) {
            return this.triggerReEngagement('inactive', daysSinceActive);
        }

        // User at risk of churning
        if (daysSinceActive >= this.WIN_BACK_DAYS) {
            return this.triggerReEngagement('winback', daysSinceActive);
        }

        return { status: 'active', daysSinceActive };
    }

    async triggerReEngagement(type, daysSinceActive) {
        const { reEngagementHistory = {} } = await chrome.storage.local.get('reEngagementHistory');

        // Don't send too frequently
        const lastSent = reEngagementHistory[type];
        if (lastSent && this.daysSince(lastSent) < 3) {
            return { status: 'cooldown', type };
        }

        // Record this trigger
        reEngagementHistory[type] = Date.now();
        await chrome.storage.local.set({ reEngagementHistory });

        // Get message based on type
        const message = this.getReEngagementMessage(type, daysSinceActive);

        return { status: 'triggered', type, message };
    }

    getReEngagementMessage(type, days) {
        const messages = {
            inactive: {
                title: 'We miss you! 👋',
                body: `It's been ${days} days since you used JSON Formatter Pro. Come back and check out the new features!`,
                cta: 'Open Extension',
                type: 'notification'
            },
            winback: {
                title: 'Still there? 🤔',
                body: 'Your JSON formatter is waiting. Need help with something? We\'re here!',
                cta: 'Get Help',
                type: 'notification'
            }
        };

        return messages[type] || messages.inactive;
    }

    // =====================
    // SUBSCRIPTION TRACKING
    // =====================

    async checkProExpiry() {
        const { subscription = {} } = await chrome.storage.local.get('subscription');

        if (!subscription.expiresAt) return null;

        const daysUntilExpiry = Math.floor((subscription.expiresAt - Date.now()) / 86400000);

        // Reminder tiers
        if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            return {
                status: 'expiring_soon',
                daysLeft: daysUntilExpiry,
                message: {
                    title: 'Pro expires soon!',
                    body: `Your Pro subscription expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Renew to keep premium features.`,
                    cta: 'Renew Now'
                }
            };
        }

        if (daysUntilExpiry <= 0) {
            const daysExpired = Math.abs(daysUntilExpiry);
            return {
                status: 'expired',
                daysSince: daysExpired,
                message: {
                    title: 'Pro has expired',
                    body: 'Your premium features are now limited. Renew to restore full access.',
                    cta: 'Renew Pro'
                }
            };
        }

        return { status: 'active', daysLeft: daysUntilExpiry };
    }

    // =====================
    // UTILITIES
    // =====================

    daysSince(timestamp) {
        if (!timestamp) return 999;
        return Math.floor((Date.now() - timestamp) / 86400000);
    }

    async getEngagementSummary() {
        const { engagementData = {} } = await chrome.storage.local.get('engagementData');
        const score = await this.getEngagementScore();
        const proStatus = await this.checkProExpiry();

        return {
            score,
            lastActive: engagementData.lastActive,
            daysSinceActive: this.daysSince(engagementData.lastActive),
            activeDaysLast30: engagementData.activeDays?.length || 0,
            totalActions: engagementData.totalActions || 0,
            proStatus
        };
    }
}

// Export singleton
const churnPrevention = new ChurnPreventionSystem();
export { churnPrevention, ChurnPreventionSystem };
