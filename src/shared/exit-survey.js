/**
 * JSON Formatter Pro - Exit Survey System
 * Uninstall feedback collection (md-17 Agent 22)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ExitSurveySystem {
    constructor() {
        this.SURVEY_BASE_URL = 'https://zovo.one/feedback/json-formatter-pro';
        this.REASONS = [
            { id: 'not_useful', label: 'Didn\'t find it useful', category: 'value' },
            { id: 'too_complicated', label: 'Too complicated to use', category: 'ux' },
            { id: 'found_alternative', label: 'Found a better alternative', category: 'competitive' },
            { id: 'too_expensive', label: 'Too expensive', category: 'pricing' },
            { id: 'bugs_issues', label: 'Bugs or technical issues', category: 'technical' },
            { id: 'privacy_concerns', label: 'Privacy concerns', category: 'trust' },
            { id: 'temporary', label: 'Just taking a break', category: 'lifecycle' },
            { id: 'other', label: 'Other reason', category: 'unknown' }
        ];
    }

    // =====================
    // UNINSTALL URL
    // =====================

    async setupUninstallURL() {
        const userData = await this.getUserContext();
        const params = new URLSearchParams({
            uid: userData.userId || 'anonymous',
            tier: userData.tier || 'free',
            version: chrome.runtime.getManifest().version,
            installed: userData.installedDays?.toString() || '0',
            actions: userData.totalActions?.toString() || '0'
        });

        chrome.runtime.setUninstallURL(`${this.SURVEY_BASE_URL}?${params.toString()}`);
    }

    async updateUninstallURL() {
        await this.setupUninstallURL();
    }

    async getUserContext() {
        const {
            userId,
            subscription = {},
            engagementData = {},
            installedAt
        } = await chrome.storage.local.get([
            'userId',
            'subscription',
            'engagementData',
            'installedAt'
        ]);

        const installedDays = installedAt
            ? Math.floor((Date.now() - installedAt) / 86400000)
            : 0;

        return {
            userId,
            tier: subscription.tier || 'free',
            installedDays,
            totalActions: engagementData.totalActions || 0,
            lastActive: engagementData.lastActive
        };
    }

    // =====================
    // FEEDBACK PROCESSING
    // =====================

    categorizeFeedback(reason) {
        const categories = {
            not_useful: { category: 'value', actionable: true, priority: 'high' },
            too_complicated: { category: 'ux', actionable: true, priority: 'high' },
            found_alternative: { category: 'competitive', actionable: true, priority: 'medium' },
            too_expensive: { category: 'pricing', actionable: true, priority: 'high' },
            bugs_issues: { category: 'technical', actionable: true, priority: 'critical' },
            privacy_concerns: { category: 'trust', actionable: true, priority: 'high' },
            temporary: { category: 'lifecycle', actionable: false, priority: 'low' },
            other: { category: 'unknown', actionable: true, priority: 'medium' }
        };

        return categories[reason] || categories.other;
    }

    getWinBackSequence(reason) {
        const sequences = {
            too_expensive: 'price_focused',
            bugs_issues: 'quality_focused',
            not_useful: 'value_focused',
            found_alternative: 'competitive_focused',
            too_complicated: 'education_focused',
            default: 'general'
        };

        return sequences[reason] || sequences.default;
    }

    // =====================
    // PRE-UNINSTALL SAVE
    // =====================

    async saveExitContext() {
        // Save context before uninstall for win-back purposes
        const context = await this.getUserContext();

        // Store in sync storage (persists after uninstall if user reinstalls)
        try {
            await chrome.storage.sync.set({
                exitContext: {
                    ...context,
                    exitedAt: Date.now()
                }
            });
        } catch (e) {
            // Sync might not be available
            console.warn('[ExitSurvey] Could not save exit context:', e);
        }
    }

    // =====================
    // REINSTALL DETECTION
    // =====================

    async checkReturningUser() {
        try {
            const { exitContext } = await chrome.storage.sync.get('exitContext');

            if (exitContext) {
                const daysSinceExit = Math.floor((Date.now() - exitContext.exitedAt) / 86400000);

                return {
                    isReturning: true,
                    daysSinceExit,
                    previousTier: exitContext.tier,
                    previousActions: exitContext.totalActions
                };
            }
        } catch (e) {
            // Ignore errors
        }

        return { isReturning: false };
    }

    async welcomeBackReturningUser() {
        const status = await this.checkReturningUser();

        if (status.isReturning) {
            // Clear exit context
            await chrome.storage.sync.remove('exitContext');

            // Return welcome back message
            return {
                show: true,
                message: {
                    title: 'Welcome back! 🎉',
                    body: status.daysSinceExit > 7
                        ? 'We\'ve made some improvements while you were away.'
                        : 'Glad to see you again!',
                    cta: 'See What\'s New'
                },
                context: status
            };
        }

        return { show: false };
    }
}

// Export singleton
const exitSurvey = new ExitSurveySystem();
export { exitSurvey, ExitSurveySystem };
