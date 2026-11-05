/**
 * JSON Formatter Pro - Viral Growth Engine
 * Referral system and share triggers (Agent 14)
 * 
 * Features:
 * - Referral link generation
 * - Share triggers at milestones
 * - Social sharing helpers
 * - Pro time rewards tracking
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ViralGrowthEngine {
    constructor() {
        this.EXTENSION_NAME = 'JSON Formatter Pro';
        this.SHARE_BASE_URL = 'https://zovo.one/json-formatter-pro';
        this.CWS_URL = 'https://chrome.google.com/webstore/detail/json-formatter-pro/YOUR_EXTENSION_ID';
    }

    // =====================
    // REFERRAL SYSTEM
    // =====================

    async generateReferralCode() {
        const { referralCode } = await chrome.storage.local.get('referralCode');

        if (referralCode) return referralCode;

        // Generate new code
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        const newCode = `jfp_${timestamp}${random}`;

        await chrome.storage.local.set({ referralCode: newCode });
        return newCode;
    }

    async getReferralLink(campaign = 'popup') {
        const code = await this.generateReferralCode();
        return `${this.SHARE_BASE_URL}?ref=${code}&utm_source=extension&utm_campaign=${campaign}`;
    }

    // =====================
    // SHARE TRIGGERS
    // =====================

    async checkShareTriggers(action) {
        const { usageStats = {} } = await chrome.storage.local.get('usageStats');

        // Update stats
        usageStats.formatCount = (usageStats.formatCount || 0) + (action === 'format' ? 1 : 0);
        usageStats.totalActions = (usageStats.totalActions || 0) + 1;
        usageStats.lastAction = Date.now();

        await chrome.storage.local.set({ usageStats });

        // Check milestone triggers
        return this.getMilestoneTrigger(usageStats);
    }

    getMilestoneTrigger(stats) {
        const milestones = [10, 50, 100, 500, 1000];
        const count = stats.formatCount;

        if (milestones.includes(count)) {
            return {
                show: true,
                type: 'milestone',
                count,
                message: this.getMilestoneMessage(count)
            };
        }

        // First format success
        if (count === 1) {
            return {
                show: true,
                type: 'first_success',
                message: {
                    title: 'Your first format!',
                    body: 'Know someone who works with JSON? Share the tool.',
                    cta: 'Share with colleague'
                }
            };
        }

        return { show: false };
    }

    getMilestoneMessage(count) {
        const messages = {
            10: {
                title: '10 Formats Complete!',
                body: 'You\'re getting productive. Help others save time too.',
                cta: 'Share your secret'
            },
            50: {
                title: '50 Formats! Power User Status',
                body: 'You\'ve saved hours of work. Spread the word.',
                cta: 'Share achievement'
            },
            100: {
                title: '100 Formats! JSON Master',
                body: 'You\'re officially a power user. Invite your team.',
                cta: 'Invite team'
            },
            500: {
                title: '500 Formats! You\'re Legendary',
                body: 'Your productivity is off the charts.',
                cta: 'Share your stats'
            },
            1000: {
                title: '1,000 Formats! Hall of Fame',
                body: 'You\'re in the top 1% of users.',
                cta: 'Claim your badge'
            }
        };

        return messages[count] || messages[10];
    }

    // =====================
    // SOCIAL SHARING
    // =====================

    async getShareContent(type = 'recommendation') {
        const link = await this.getReferralLink('share');
        const stats = await this.getShareableStats();

        const templates = {
            recommendation: `I use ${this.EXTENSION_NAME} for all my JSON work. Clean formatting, validation, conversion. Check it out: ${link}`,

            milestone: `Just hit ${stats.formatCount} JSON formats with ${this.EXTENSION_NAME}! Saves me so much time. ${link}`,

            twitter: `🔧 ${this.EXTENSION_NAME} is my go-to tool for JSON. Format, validate, convert instantly. 100% local & private. ${link}`,

            linkedin: `Developer tip: ${this.EXTENSION_NAME} has saved me countless hours formatting and validating JSON. If you work with APIs, this is essential. ${link}`,

            email: `Hey,\n\nI've been using ${this.EXTENSION_NAME} and thought you might find it useful. It formats, validates, and converts JSON instantly.\n\nCheck it out: ${link}\n\nBest`
        };

        return templates[type] || templates.recommendation;
    }

    async getShareableStats() {
        const { usageStats = {} } = await chrome.storage.local.get('usageStats');
        return {
            formatCount: usageStats.formatCount || 0,
            totalActions: usageStats.totalActions || 0,
            daysSinceInstall: Math.floor((Date.now() - (usageStats.installedAt || Date.now())) / 86400000)
        };
    }

    // Share URLs for social platforms
    async getShareUrls() {
        const link = await this.getReferralLink('social');
        const text = encodeURIComponent(`${this.EXTENSION_NAME} - Format, validate, convert JSON instantly`);

        return {
            twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(link)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
            reddit: `https://reddit.com/submit?url=${encodeURIComponent(link)}&title=${text}`,
            email: `mailto:?subject=${text}&body=${encodeURIComponent(await this.getShareContent('email'))}`
        };
    }

    // =====================
    // REWARD TRACKING
    // =====================

    async trackReferral(referredBy) {
        const { referrals = [] } = await chrome.storage.local.get('referrals');

        referrals.push({
            referredBy,
            timestamp: Date.now(),
            status: 'installed'
        });

        await chrome.storage.local.set({ referrals });
    }

    async getReferralStats() {
        const { referralCode } = await chrome.storage.local.get('referralCode');
        const { referralRewards = {} } = await chrome.storage.local.get('referralRewards');

        return {
            code: referralCode,
            totalReferred: referralRewards.count || 0,
            proDaysEarned: referralRewards.proDays || 0,
            tier: this.getReferralTier(referralRewards.count || 0)
        };
    }

    getReferralTier(count) {
        if (count >= 50) return { name: 'Platinum', reward: 14 };
        if (count >= 20) return { name: 'Gold', reward: 10 };
        if (count >= 5) return { name: 'Silver', reward: 7 };
        return { name: 'Bronze', reward: 7 };
    }
}

// Export singleton
const viralEngine = new ViralGrowthEngine();
export { viralEngine, ViralGrowthEngine };
