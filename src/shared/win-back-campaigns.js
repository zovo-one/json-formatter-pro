/**
 * JSON Formatter Pro - Win-Back Campaigns
 * Re-engagement messaging (md-17 Agent 23)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class WinBackCampaigns {
    constructor() {
        this.EXTENSION_NAME = 'JSON Formatter Pro';
        this.CWS_URL = 'https://chrome.google.com/webstore/detail/json-formatter-pro/YOUR_ID';
    }

    // =====================
    // MESSAGE TEMPLATES
    // =====================

    getSequenceMessages() {
        return {
            // Day 1: Immediate acknowledgment
            day1: {
                subject: `We noticed you left ${this.EXTENSION_NAME} - here's what's new`,
                type: 'acknowledgment',
                template: this.getDay1Template()
            },

            // Day 3: Value reminder
            day3: {
                subject: 'Remember all the JSON you formatted?',
                type: 'value_reminder',
                template: this.getDay3Template()
            },

            // Day 7: Incentive offer
            day7: {
                subject: 'A special offer just for you',
                type: 'incentive',
                template: this.getDay7Template()
            },

            // Day 14: Final attempt
            day14: {
                subject: 'Last chance: We miss you',
                type: 'final_attempt',
                template: this.getDay14Template()
            }
        };
    }

    getDay1Template() {
        return {
            title: 'We noticed you left',
            body: `Before you move on, we wanted to share some things you might have missed.`,
            features: [
                'Improved formatting speed',
                'Better error messages',
                'New YAML conversion'
            ],
            cta: 'Give Us Another Try',
            ctaUrl: this.CWS_URL
        };
    }

    getDay3Template() {
        return {
            title: 'Remember when you formatted all that JSON?',
            body: 'During your time with us, you saved hours of work.',
            stats: [
                'Formatted {formatCount} JSON documents',
                'Caught {errorCount} syntax errors',
                'Saved approximately {timeSaved} minutes'
            ],
            cta: 'Pick Up Where You Left Off',
            ctaUrl: this.CWS_URL
        };
    }

    getDay7Template() {
        return {
            title: 'A special offer just for you',
            body: 'We really want you back, and we\'re willing to prove it.',
            offer: {
                type: 'discount',
                value: 50,
                duration: '3 months',
                description: 'Get 50% off Pro for 3 months'
            },
            cta: 'Claim Your Offer',
            ctaUrl: `${this.CWS_URL}?offer=winback50`
        };
    }

    getDay14Template() {
        return {
            title: 'Last chance',
            body: 'This is our last message (we promise!).',
            message: 'If you\'d like to give us another chance, the door is always open.',
            cta: 'Reinstall Extension',
            ctaUrl: this.CWS_URL
        };
    }

    // =====================
    // INCENTIVE ENGINE
    // =====================

    getIncentiveForReason(reason) {
        const incentives = {
            too_expensive: {
                type: 'discount',
                value: 50,
                duration: '3 months',
                message: 'Get 50% off Pro for 3 months'
            },
            not_useful: {
                type: 'onboarding',
                value: 'personal_walkthrough',
                message: 'Free personal walkthrough of advanced features'
            },
            bugs_issues: {
                type: 'priority_support',
                value: '6_months',
                message: 'Priority support access for 6 months'
            },
            found_alternative: {
                type: 'feature_match',
                value: 'tell_us',
                message: 'Tell us what features you need - we\'ll build them'
            },
            too_complicated: {
                type: 'extended_trial',
                value: 60,
                message: '60-day extended Pro trial with guided onboarding'
            },
            default: {
                type: 'trial',
                value: 30,
                message: '30-day full Pro trial on us'
            }
        };

        return incentives[reason] || incentives.default;
    }

    // =====================
    // SEQUENCE MANAGEMENT
    // =====================

    async scheduleWinBackSequence(userId, reason) {
        const { winBackSchedule = {} } = await chrome.storage.local.get('winBackSchedule');

        // Don't reschedule if already active
        if (winBackSchedule[userId] && !winBackSchedule[userId].completed) {
            return { status: 'already_scheduled' };
        }

        const sequence = this.getSequenceForReason(reason);
        const incentive = this.getIncentiveForReason(reason);

        winBackSchedule[userId] = {
            reason,
            sequence,
            incentive,
            startedAt: Date.now(),
            messages: ['day1', 'day3', 'day7', 'day14'],
            sentMessages: [],
            completed: false
        };

        await chrome.storage.local.set({ winBackSchedule });

        return {
            status: 'scheduled',
            sequence,
            incentive
        };
    }

    getSequenceForReason(reason) {
        const sequences = {
            too_expensive: 'price_focused',
            bugs_issues: 'quality_focused',
            not_useful: 'value_focused',
            found_alternative: 'competitive_focused',
            too_complicated: 'education_focused'
        };

        return sequences[reason] || 'general';
    }

    async getNextMessage(userId) {
        const { winBackSchedule = {} } = await chrome.storage.local.get('winBackSchedule');
        const schedule = winBackSchedule[userId];

        if (!schedule || schedule.completed) {
            return null;
        }

        const daysSinceStart = Math.floor((Date.now() - schedule.startedAt) / 86400000);
        const messageTiming = { day1: 1, day3: 3, day7: 7, day14: 14 };

        for (const message of schedule.messages) {
            if (!schedule.sentMessages.includes(message) &&
                daysSinceStart >= messageTiming[message]) {
                return {
                    message,
                    template: this.getSequenceMessages()[message],
                    incentive: schedule.incentive
                };
            }
        }

        return null;
    }

    async markMessageSent(userId, message) {
        const { winBackSchedule = {} } = await chrome.storage.local.get('winBackSchedule');

        if (winBackSchedule[userId]) {
            winBackSchedule[userId].sentMessages.push(message);

            // Mark completed if all messages sent
            if (winBackSchedule[userId].sentMessages.length >=
                winBackSchedule[userId].messages.length) {
                winBackSchedule[userId].completed = true;
            }

            await chrome.storage.local.set({ winBackSchedule });
        }
    }

    // =====================
    // STATS
    // =====================

    async getPersonalizedStats() {
        const { engagementData = {} } = await chrome.storage.local.get('engagementData');

        const formatCount = engagementData.actionCounts?.format || 0;
        const errorCount = engagementData.actionCounts?.validate || 0;
        const timeSaved = formatCount * 2; // Estimate 2 minutes saved per format

        return {
            formatCount,
            errorCount,
            timeSaved
        };
    }
}

// Export singleton
const winBackCampaigns = new WinBackCampaigns();
export { winBackCampaigns, WinBackCampaigns };
