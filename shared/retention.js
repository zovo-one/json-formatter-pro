/**
 * Zovo Retention System - JSON Formatter Pro
 * Local-only prompts to encourage engagement and conversion
 */

const EXTENSION_ID = 'json-formatter-pro';
const EXTENSION_NAME = 'JSON Formatter Pro';

const RETENTION_PROMPTS = [
    {
        id: 'rate_extension',
        trigger: { usageCount: 10 },
        title: 'Enjoying JSON Formatter Pro?',
        message: 'A quick rating helps other developers discover this tool.',
        cta: 'Rate on Chrome Web Store',
        ctaUrl: 'https://chrome.google.com/webstore/detail/json-formatter-pro',
        dismissable: true,
        priority: 1
    },
    {
        id: 'join_zovo',
        trigger: { daysSinceInstall: 3 },
        title: 'Want more developer tools?',
        message: 'Zovo members get early access to all extensions.',
        cta: 'Learn about Zovo',
        ctaUrl: `https://zovo.one?ref=${EXTENSION_ID}&source=retention`,
        dismissable: true,
        priority: 2
    },
    {
        id: 'share_extension',
        trigger: { daysSinceInstall: 7 },
        title: 'Know a developer who\'d like this?',
        message: 'Share JSON Formatter Pro with a colleague.',
        cta: 'Copy share link',
        ctaAction: 'copy_share_link',
        dismissable: true,
        priority: 3
    },
    {
        id: 'github_star',
        trigger: { usageCount: 25 },
        title: 'JSON Formatter Pro is open source!',
        message: 'Star us on GitHub to support development.',
        cta: 'Star on GitHub',
        ctaUrl: 'https://github.com/theluckystrike/json-formatter-pro',
        dismissable: true,
        priority: 4
    }
];

class ZovoRetention {
    constructor() {
        this.prompts = RETENTION_PROMPTS;
    }

    async checkPrompts() {
        const storage = await chrome.storage.local.get([
            'dismissedPrompts',
            'usageCount',
            'installedAt'
        ]);

        const dismissedPrompts = storage.dismissedPrompts || [];
        const usageCount = storage.usageCount || 0;
        const installedAt = storage.installedAt || Date.now();

        const daysSinceInstall = Math.floor(
            (Date.now() - installedAt) / (24 * 60 * 60 * 1000)
        );

        for (const prompt of this.prompts) {
            if (dismissedPrompts.includes(prompt.id)) continue;

            const { trigger } = prompt;

            if (trigger.usageCount && usageCount >= trigger.usageCount) {
                return prompt;
            }

            if (trigger.daysSinceInstall && daysSinceInstall >= trigger.daysSinceInstall) {
                return prompt;
            }
        }

        return null;
    }

    async dismissPrompt(promptId) {
        const { dismissedPrompts = [] } = await chrome.storage.local.get('dismissedPrompts');
        if (!dismissedPrompts.includes(promptId)) {
            dismissedPrompts.push(promptId);
            await chrome.storage.local.set({ dismissedPrompts });
        }
    }

    async incrementUsage() {
        const { usageCount = 0 } = await chrome.storage.local.get('usageCount');
        await chrome.storage.local.set({ usageCount: usageCount + 1 });
    }

    async getStats() {
        const storage = await chrome.storage.local.get(['usageCount', 'installedAt', 'analytics']);
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const analytics = storage.analytics || [];

        return {
            totalUsage: storage.usageCount || 0,
            daysSinceInstall: storage.installedAt
                ? Math.floor((now - storage.installedAt) / (24 * 60 * 60 * 1000))
                : 0,
            eventsToday: analytics.filter(e => e.timestamp > dayAgo).length,
            eventsThisWeek: analytics.filter(e => e.timestamp > weekAgo).length
        };
    }
}

if (typeof window !== 'undefined') {
    window.ZovoRetention = ZovoRetention;
}
