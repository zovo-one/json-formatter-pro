/**
 * JSON Formatter Pro - Self-Service FAQ
 * Help resources and troubleshooting (md-19 Agent 34)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class SelfServiceFAQ {
    constructor() {
        this.extensionName = 'JSON Formatter Pro';
    }

    // =====================
    // FAQ CATEGORIES
    // =====================

    getCategories() {
        return [
            { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
            { id: 'features', label: 'Features', icon: '✨' },
            { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' },
            { id: 'billing', label: 'Billing & Pro', icon: '💳' },
            { id: 'privacy', label: 'Privacy & Security', icon: '🔒' }
        ];
    }

    // =====================
    // FAQ ITEMS
    // =====================

    getFAQItems() {
        return {
            'getting-started': [
                {
                    id: 'gs-1',
                    question: 'How do I format JSON?',
                    answer: `1. Copy your JSON to the clipboard
2. Click the ${this.extensionName} icon in your toolbar
3. Paste your JSON into the input area
4. Click "Format" to beautify your JSON

You can also right-click on any webpage with JSON content and select "Format JSON".`
                },
                {
                    id: 'gs-2',
                    question: 'Where is the extension icon?',
                    answer: `If you don't see the icon in your toolbar:

1. Click the puzzle piece icon (Extensions menu) in Chrome
2. Find "${this.extensionName}"
3. Click the pin icon to show it in your toolbar

If it's not listed, go to chrome://extensions and make sure it's enabled.`
                },
                {
                    id: 'gs-3',
                    question: 'Does it work on all websites?',
                    answer: `Yes! ${this.extensionName} can format JSON from any source:

• API responses
• JSON files
• Web pages with JSON content
• Clipboard content

Note: Some enterprise sites may have content security policies that limit extension access.`
                }
            ],

            'features': [
                {
                    id: 'ft-1',
                    question: 'What formats can I convert to?',
                    answer: `${this.extensionName} supports:

**Free tier:**
• Format/Beautify JSON
• Minify JSON
• Validate JSON
• Tree View

**Pro tier:**
• Convert to YAML
• Convert to CSV
• JSON Schema validation
• Side-by-side Diff
• JSONPath query`
                },
                {
                    id: 'ft-2',
                    question: 'What is the maximum file size?',
                    answer: `**Free tier:** Up to 500KB
**Pro tier:** Up to 10MB

For very large files (10MB+), we recommend using a desktop tool for better performance.`
                },
                {
                    id: 'ft-3',
                    question: 'Can I customize the formatting?',
                    answer: `Yes! Go to Settings to customize:

• Indentation (2 or 4 spaces, tabs)
• Theme (light, dark, system)
• Font size
• Sort keys alphabetically
• Collapse depth in tree view`
                }
            ],

            'troubleshooting': [
                {
                    id: 'ts-1',
                    question: 'Extension not working on a website',
                    answer: `Try these steps:

1. **Refresh the page** - Sometimes a simple refresh helps
2. **Check permissions** - Click the extension, go to Settings > Permissions
3. **Try in Incognito** - Enable "Allow in Incognito" in chrome://extensions
4. **Disable other extensions** - Some extensions may conflict

If still not working, contact support with the website URL.`
                },
                {
                    id: 'ts-2',
                    question: 'JSON is showing an error',
                    answer: `Common JSON errors:

• **Unexpected token** - Missing comma or bracket
• **Unterminated string** - Missing closing quote
• **Invalid value** - Undefined or NaN (not valid in JSON)

The extension highlights the error location to help you fix it.`
                },
                {
                    id: 'ts-3',
                    question: 'Extension is slow',
                    answer: `For large JSON files:

1. Try the "Minify" option first (smaller processing)
2. Use "Collapse All" in tree view
3. Close other Chrome tabs to free memory
4. Upgrade to Pro for optimized large file handling`
                }
            ],

            'billing': [
                {
                    id: 'bl-1',
                    question: 'How much does Pro cost?',
                    answer: `${this.extensionName} Pro is $2.99/month or $24/year (save 33%).

Pro includes:
• Unlimited file size (10MB)
• All conversion formats (YAML, CSV)
• JSON Schema validation
• Advanced Diff view
• Priority support`
                },
                {
                    id: 'bl-2',
                    question: 'How do I cancel my subscription?',
                    answer: `You can cancel anytime:

1. Open the extension
2. Go to Settings > Subscription
3. Click "Manage Subscription"
4. Click "Cancel Subscription"

You'll keep Pro access until the end of your billing period.`
                },
                {
                    id: 'bl-3',
                    question: 'Can I get a refund?',
                    answer: `We offer a 7-day money-back guarantee. If you're not satisfied within the first 7 days, contact support@zovo.one for a full refund.`
                }
            ],

            'privacy': [
                {
                    id: 'pr-1',
                    question: 'Is my data sent to any servers?',
                    answer: `**No.** All JSON processing happens locally in your browser. We never send your JSON data to any server.

The only data we collect:
• Anonymous usage statistics (can be disabled)
• Error reports (helps us fix bugs)

Your JSON stays on your device.`
                },
                {
                    id: 'pr-2',
                    question: 'Why does it need "all sites" permission?',
                    answer: `The "all sites" permission allows the extension to:

• Detect JSON content on any webpage
• Offer to format JSON automatically
• Work with APIs and JSON files

We only activate on pages with JSON content. We cannot and do not access your personal data, passwords, or browsing history.`
                },
                {
                    id: 'pr-3',
                    question: 'Where is my data stored?',
                    answer: `All your data is stored locally:

• Settings → Chrome's local storage
• History → Your device only
• Pro license → Synced via Chrome sync (optional)

We use zero remote storage for your JSON content.`
                }
            ]
        };
    }

    // =====================
    // SEARCH
    // =====================

    search(query) {
        const lowerQuery = query.toLowerCase();
        const allItems = this.getFAQItems();
        const results = [];

        for (const [category, items] of Object.entries(allItems)) {
            for (const item of items) {
                const questionMatch = item.question.toLowerCase().includes(lowerQuery);
                const answerMatch = item.answer.toLowerCase().includes(lowerQuery);

                if (questionMatch || answerMatch) {
                    results.push({
                        ...item,
                        category,
                        relevance: questionMatch ? 2 : 1
                    });
                }
            }
        }

        return results.sort((a, b) => b.relevance - a.relevance);
    }

    // =====================
    // QUICK TROUBLESHOOTING
    // =====================

    getTroubleshootingSteps(issue) {
        const steps = {
            'not-working': [
                'Refresh the page',
                'Check if extension is enabled at chrome://extensions',
                'Try in a new Chrome profile',
                'Reinstall the extension'
            ],
            'slow': [
                'Close unused browser tabs',
                'Try with a smaller JSON file',
                'Clear extension cache in Settings',
                'Consider upgrading to Pro for large files'
            ],
            'error': [
                'Check your JSON syntax',
                'Try pasting in a JSON validator',
                'Look for unclosed brackets or quotes',
                'Contact support with the error message'
            ]
        };

        return steps[issue] || steps['not-working'];
    }
}

// Export singleton
const selfServiceFAQ = new SelfServiceFAQ();
export { selfServiceFAQ, SelfServiceFAQ };
