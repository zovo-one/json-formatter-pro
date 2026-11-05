/**
 * JSON Formatter Pro - Ticket Categorizer
 * Automatic support ticket classification (md-19 Agent 32)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class TicketCategorizer {
    constructor() {
        this.rules = {
            categories: {
                installation: {
                    keywords: ['install', 'setup', 'download', 'add to chrome', 'enable', 'activate'],
                    priority: 'normal'
                },
                bug: {
                    keywords: ['bug', 'error', 'crash', 'broken', 'not working', 'fail', 'issue', 'problem'],
                    priority: 'high'
                },
                billing: {
                    keywords: ['refund', 'payment', 'charge', 'subscription', 'cancel', 'invoice', 'price', 'license', 'pro'],
                    priority: 'high'
                },
                feature: {
                    keywords: ['feature', 'request', 'suggestion', 'would be nice', 'wish', 'add', 'improve'],
                    priority: 'low'
                },
                howto: {
                    keywords: ['how to', 'how do', 'can i', 'is it possible', 'where is', 'tutorial', 'help'],
                    priority: 'normal'
                },
                performance: {
                    keywords: ['slow', 'lag', 'freeze', 'memory', 'cpu', 'battery', 'heavy'],
                    priority: 'high'
                },
                compatibility: {
                    keywords: ['website', 'page', 'site', 'doesnt work on', 'not compatible', 'conflict'],
                    priority: 'normal'
                },
                json: {
                    keywords: ['format', 'validate', 'minify', 'convert', 'yaml', 'csv', 'schema', 'diff'],
                    priority: 'normal'
                }
            },

            severityIndicators: {
                critical: ['urgent', 'asap', 'emergency', 'data loss', 'security', 'immediately', 'critical'],
                frustrated: ['terrible', 'worst', 'hate', 'awful', 'useless', 'garbage', 'waste', 'scam'],
                positive: ['love', 'great', 'amazing', 'thank', 'awesome', 'helpful', 'perfect', 'best']
            }
        };

        this.bugPatterns = [
            /doesn'?t work/i,
            /not working/i,
            /broken/i,
            /error/i,
            /crash/i,
            /bug/i,
            /fail/i,
            /issue/i,
            /problem/i,
            /used to work/i,
            /stopped working/i,
            /can'?t [a-z]+/i,
            /won'?t [a-z]+/i
        ];

        this.featurePatterns = [
            /would be (nice|great|cool)/i,
            /can you add/i,
            /please add/i,
            /feature request/i,
            /suggestion/i,
            /wish/i,
            /it would help if/i,
            /would love/i,
            /could you (add|include|implement)/i,
            /idea:/i,
            /how about/i
        ];
    }

    // =====================
    // CATEGORIZATION
    // =====================

    categorize(text) {
        const lowerText = text.toLowerCase();
        const result = {
            category: 'general',
            tags: [],
            priority: 'normal',
            sentiment: 'neutral',
            confidence: 0,
            requiresHumanReview: false
        };

        // Category detection with scoring
        let maxMatches = 0;
        for (const [category, config] of Object.entries(this.rules.categories)) {
            const matches = config.keywords.filter(kw => lowerText.includes(kw)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                result.category = category;
                result.priority = config.priority;
                result.confidence = Math.min(matches / config.keywords.length, 1);
            }
            if (matches > 0) {
                result.tags.push(category);
            }
        }

        // Severity adjustment
        if (this.rules.severityIndicators.critical.some(kw => lowerText.includes(kw))) {
            result.priority = 'urgent';
            result.tags.push('critical');
            result.requiresHumanReview = true;
        }

        // Sentiment detection
        if (this.rules.severityIndicators.frustrated.some(kw => lowerText.includes(kw))) {
            result.sentiment = 'negative';
            result.tags.push('frustrated-user');
            if (result.priority !== 'urgent') result.priority = 'high';
            result.requiresHumanReview = true;
        } else if (this.rules.severityIndicators.positive.some(kw => lowerText.includes(kw))) {
            result.sentiment = 'positive';
            result.tags.push('happy-user');
        }

        return result;
    }

    // =====================
    // BUG VS FEATURE
    // =====================

    classifyBugOrFeature(text) {
        const bugScore = this.bugPatterns.filter(p => p.test(text)).length;
        const featureScore = this.featurePatterns.filter(p => p.test(text)).length;

        if (bugScore > featureScore) {
            return { type: 'bug', confidence: bugScore / this.bugPatterns.length };
        } else if (featureScore > bugScore) {
            return { type: 'feature', confidence: featureScore / this.featurePatterns.length };
        } else if (bugScore > 0) {
            return { type: 'bug', confidence: 0.5 };
        }
        return { type: 'question', confidence: 0.3 };
    }

    // =====================
    // SENTIMENT
    // =====================

    analyzeSentiment(text) {
        const positiveWords = new Set([
            'love', 'great', 'amazing', 'awesome', 'excellent', 'fantastic',
            'helpful', 'useful', 'perfect', 'best', 'thank', 'thanks', 'appreciate',
            'wonderful', 'brilliant', 'outstanding', 'superb', 'impressed'
        ]);

        const negativeWords = new Set([
            'hate', 'terrible', 'awful', 'worst', 'useless', 'garbage', 'trash',
            'horrible', 'annoying', 'frustrated', 'disappointed', 'waste', 'scam',
            'broken', 'stupid', 'ridiculous', 'pathetic', 'disgusting'
        ]);

        const words = text.toLowerCase().split(/\W+/);
        let score = 0;

        for (const word of words) {
            if (positiveWords.has(word)) score += 1;
            if (negativeWords.has(word)) score -= 1;
        }

        const normalizedScore = Math.max(-1, Math.min(1, score / 5));

        return {
            score: normalizedScore,
            label: normalizedScore > 0.2 ? 'positive' : normalizedScore < -0.2 ? 'negative' : 'neutral',
            requiresPriority: normalizedScore < -0.5,
            suggestedAction: this.getSuggestedAction(normalizedScore)
        };
    }

    getSuggestedAction(score) {
        if (score < -0.7) return 'Escalate to senior support immediately';
        if (score < -0.4) return 'Prioritize response, consider compensation';
        if (score < -0.2) return 'Respond with extra empathy';
        if (score > 0.5) return 'Request review/testimonial';
        return 'Standard response';
    }

    // =====================
    // FULL ANALYSIS
    // =====================

    analyze(text) {
        const categorization = this.categorize(text);
        const classification = this.classifyBugOrFeature(text);
        const sentiment = this.analyzeSentiment(text);

        return {
            ...categorization,
            classification,
            sentimentAnalysis: sentiment,
            summary: {
                category: categorization.category,
                type: classification.type,
                priority: categorization.priority,
                sentiment: sentiment.label,
                action: sentiment.suggestedAction
            }
        };
    }
}

// Export singleton
const ticketCategorizer = new TicketCategorizer();
export { ticketCategorizer, TicketCategorizer };
