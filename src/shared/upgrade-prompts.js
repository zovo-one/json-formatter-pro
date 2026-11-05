/**
 * JSON Formatter Pro - Upgrade Prompts System
 * Smart Pro conversion (Agent 20)
 * 
 * Features:
 * - Contextual upgrade prompts
 * - Usage-based triggers
 * - Feature gating
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class UpgradePromptSystem {
    constructor() {
        this.UPGRADE_URL = 'https://zovo.one/json-formatter-pro/pro';

        // Premium features
        this.PRO_FEATURES = [
            { id: 'schema_validation', name: 'JSON Schema Validation', description: 'Validate JSON against schemas' },
            { id: 'advanced_diff', name: 'Advanced Diff', description: 'Line-by-line comparison with merge' },
            { id: 'unlimited_size', name: 'Unlimited Size', description: 'Process JSON up to 10MB' },
            { id: 'unlimited_ops', name: 'Unlimited Operations', description: 'No daily limits' },
            { id: 'export_formats', name: 'Export Formats', description: 'Export to YAML, XML, CSV' },
            { id: 'query_jspath', name: 'JSONPath Query', description: 'Query JSON with JSONPath' },
            { id: 'custom_themes', name: 'Custom Themes', description: 'Create your own color schemes' },
            { id: 'sync_settings', name: 'Sync Settings', description: 'Sync across devices' }
        ];
    }

    // =====================
    // PROMPT TRIGGERS
    // =====================

    async shouldShowUpgradePrompt(context) {
        const tier = await this.getUserTier();
        if (tier === 'pro') return { show: false };

        const { upgradePromptHistory = {} } = await chrome.storage.local.get('upgradePromptHistory');

        // Don't show too frequently (max once per day per type)
        const lastShown = upgradePromptHistory[context] || 0;
        if (Date.now() - lastShown < 86400000) {
            return { show: false, reason: 'cooldown' };
        }

        // Get prompt based on context
        const prompt = this.getPromptForContext(context);

        return { show: true, prompt };
    }

    getPromptForContext(context) {
        const prompts = {
            limit_reached: {
                type: 'modal',
                icon: '⚡',
                title: 'Upgrade to Pro',
                body: 'You\'ve reached your daily limit. Upgrade for unlimited operations.',
                cta: 'Go Pro - $2.99/mo',
                features: ['unlimited_ops', 'unlimited_size']
            },

            large_file: {
                type: 'inline',
                icon: '📦',
                title: 'Need more power?',
                body: 'Pro handles files up to 10MB with no slowdown.',
                cta: 'Unlock Pro',
                features: ['unlimited_size']
            },

            feature_locked: {
                type: 'modal',
                icon: '🔒',
                title: 'Pro Feature',
                body: 'This feature is available in JSON Formatter Pro.',
                cta: 'Upgrade Now',
                features: ['schema_validation', 'advanced_diff', 'export_formats']
            },

            milestone: {
                type: 'banner',
                icon: '🎉',
                title: '100 formats! You\'re a power user',
                body: 'Get the most out of JSON Formatter Pro.',
                cta: 'See Pro Features',
                features: ['unlimited_ops', 'query_jspath', 'custom_themes']
            },

            sticky_footer: {
                type: 'footer',
                text: 'Upgrade to Pro for unlimited operations',
                cta: 'Upgrade'
            }
        };

        return prompts[context] || prompts.feature_locked;
    }

    async recordPromptShown(context) {
        const { upgradePromptHistory = {} } = await chrome.storage.local.get('upgradePromptHistory');

        upgradePromptHistory[context] = Date.now();
        upgradePromptHistory.totalShown = (upgradePromptHistory.totalShown || 0) + 1;

        await chrome.storage.local.set({ upgradePromptHistory });
    }

    // =====================
    // FEATURE GATING
    // =====================

    async isFeatureUnlocked(featureId) {
        const tier = await this.getUserTier();

        // All features unlocked for Pro
        if (tier === 'pro') return true;

        // Free features
        const freeFeatures = ['format', 'minify', 'validate', 'copy', 'tree_view'];
        return freeFeatures.includes(featureId);
    }

    async getFeatureStatus(featureId) {
        const unlocked = await this.isFeatureUnlocked(featureId);
        const feature = this.PRO_FEATURES.find(f => f.id === featureId);

        return {
            id: featureId,
            name: feature?.name || featureId,
            description: feature?.description,
            unlocked,
            requiresPro: !unlocked && !!feature
        };
    }

    async getProFeaturesStatus() {
        const tier = await this.getUserTier();

        return this.PRO_FEATURES.map(f => ({
            ...f,
            unlocked: tier === 'pro'
        }));
    }

    // =====================
    // CONVERSION TRACKING
    // =====================

    async recordUpgradeClick(source) {
        const { conversionData = {} } = await chrome.storage.local.get('conversionData');

        conversionData.clicks = conversionData.clicks || [];
        conversionData.clicks.push({
            source,
            timestamp: Date.now()
        });

        // Keep last 50 clicks
        conversionData.clicks = conversionData.clicks.slice(-50);

        await chrome.storage.local.set({ conversionData });

        // Open upgrade page
        chrome.tabs.create({ url: `${this.UPGRADE_URL}?source=${source}` });
    }

    async getConversionStats() {
        const { conversionData = {} } = await chrome.storage.local.get('conversionData');
        const { upgradePromptHistory = {} } = await chrome.storage.local.get('upgradePromptHistory');

        return {
            promptsShown: upgradePromptHistory.totalShown || 0,
            clicksTotal: conversionData.clicks?.length || 0,
            clicksBySource: this.groupBy(conversionData.clicks || [], 'source')
        };
    }

    // =====================
    // UTILITIES
    // =====================

    async getUserTier() {
        const { subscription = {} } = await chrome.storage.local.get('subscription');

        if (subscription.tier === 'pro' && subscription.expiresAt > Date.now()) {
            return 'pro';
        }

        return 'free';
    }

    groupBy(arr, key) {
        return arr.reduce((acc, item) => {
            const k = item[key];
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
    }
}

// Export singleton
const upgradePrompts = new UpgradePromptSystem();
export { upgradePrompts, UpgradePromptSystem };
