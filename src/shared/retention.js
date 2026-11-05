/**
 * JSON Formatter Pro - Retention System
 * Smart prompts based on usage milestones
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

const ZovoRetention = {
    // Prompt definitions
    prompts: [
        {
            id: 'rate_extension',
            title: '⭐ Enjoying JSON Formatter Pro?',
            message: 'If you find this tool helpful, a quick rating helps other developers discover it!',
            cta: 'Rate on Chrome Store',
            ctaUrl: 'https://chromewebstore.google.com/detail/gbnadjkeegkhbcoeaeaoedpojlcknnhp/reviews',
            trigger: { usageCount: 10 }
        },
        {
            id: 'join_zovo',
            title: '🚀 Get More from Zovo',
            message: 'Join the Zovo community for updates, new extensions, and early access to features.',
            cta: 'Learn More',
            ctaUrl: 'https://zovo.one/pricing?ref=json-retention',
            trigger: { daysSinceInstall: 3 }
        },
        {
            id: 'share_extension',
            title: '💜 Spread the Word',
            message: 'Know other developers who work with JSON? Share JSON Formatter Pro with them!',
            cta: 'Share',
            ctaUrl: 'https://twitter.com/intent/tweet?text=Just%20discovered%20JSON%20Formatter%20Pro%20-%20the%20most%20beautiful%20JSON%20tool%20for%20Chrome!%20https://chromewebstore.google.com/detail/gbnadjkeegkhbcoeaeaoedpojlcknnhp',
            trigger: { daysSinceInstall: 7 }
        },
        {
            id: 'upgrade_pro',
            title: '✨ Unlock Pro Features',
            message: 'You\'ve formatted over 50 JSONs! Upgrade to Pro for YAML conversion, CSV export, and more.',
            cta: 'Upgrade to Pro',
            ctaUrl: 'https://zovo.one/json-formatter-pro/upgrade',
            trigger: { usageCount: 50 }
        }
    ],

    /**
     * Check which prompt should be shown (if any)
     * @returns {Promise<Object|null>}
     */
    async checkPrompts() {
        // Check if Chrome storage is available
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            return null;
        }

        const storage = await chrome.storage.local.get([
            'dismissedPrompts',
            'usageCount',
            'installedAt',
            'isPro'
        ]);

        const dismissedPrompts = storage.dismissedPrompts || [];
        const usageCount = storage.usageCount || 0;
        const installedAt = storage.installedAt || Date.now();
        const isPro = storage.isPro || false;

        const daysSinceInstall = Math.floor(
            (Date.now() - installedAt) / (24 * 60 * 60 * 1000)
        );

        // Don't show upgrade prompt to Pro users
        const filteredPrompts = this.prompts.filter(p => {
            if (p.id === 'upgrade_pro' && isPro) return false;
            return true;
        });

        for (const prompt of filteredPrompts) {
            // Skip if dismissed
            if (dismissedPrompts.includes(prompt.id)) continue;

            // Check trigger conditions
            if (prompt.trigger.usageCount && usageCount >= prompt.trigger.usageCount) {
                return prompt;
            }
            if (prompt.trigger.daysSinceInstall && daysSinceInstall >= prompt.trigger.daysSinceInstall) {
                return prompt;
            }
        }

        return null;
    },

    /**
     * Dismiss a prompt (won't show again)
     * @param {string} promptId
     */
    async dismissPrompt(promptId) {
        const { dismissedPrompts = [] } = await chrome.storage.local.get('dismissedPrompts');

        if (!dismissedPrompts.includes(promptId)) {
            dismissedPrompts.push(promptId);
            await chrome.storage.local.set({ dismissedPrompts });
        }
    },

    /**
     * Render a retention prompt in the popup
     * @param {HTMLElement} container - Container element to render into
     */
    async renderPrompt(container) {
        if (!container) return;

        try {
            const prompt = await this.checkPrompts();

            if (!prompt) {
                container.hidden = true;
                return;
            }

            container.hidden = false;
            container.innerHTML = `
          <button class="zovo-retention-close" id="dismissPrompt" title="Dismiss">×</button>
          <h4 class="zovo-retention-title">${prompt.title}</h4>
          <p class="zovo-retention-message">${prompt.message}</p>
          <a class="zovo-btn zovo-btn-primary zovo-btn-sm" href="${prompt.ctaUrl}" target="_blank" id="promptCta">
            ${prompt.cta}
          </a>
        `;

            // Bind dismiss handler
            const dismissBtn = container.querySelector('#dismissPrompt');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', async () => {
                    await this.dismissPrompt(prompt.id);
                    container.hidden = true;
                });
            }

            // Dismiss after CTA click
            const ctaBtn = container.querySelector('#promptCta');
            if (ctaBtn) {
                ctaBtn.addEventListener('click', async () => {
                    await this.dismissPrompt(prompt.id);
                });
            }
        } catch (error) {
            console.error('[Zovo Retention] Error rendering prompt:', error);
            container.hidden = true;
        }
    },

    /**
     * Track a milestone and show celebration (optional)
     * @param {string} milestone - Milestone name
     */
    async celebrate(milestone) {
        const celebrations = {
            '100_formats': {
                title: '🎉 100 Formats!',
                message: 'You\'ve formatted 100 JSONs. You\'re a power user!'
            },
            '500_formats': {
                title: '🚀 500 Formats!',
                message: 'Half a thousand formats! JSON Formatter Pro loves you.'
            }
        };

        const celebration = celebrations[milestone];
        if (!celebration) return null;

        return celebration;
    }
};

// Export for use in popup
if (typeof window !== 'undefined') {
    window.ZovoRetention = ZovoRetention;
}
