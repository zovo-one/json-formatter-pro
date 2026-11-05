/**
 * JSON Formatter Pro - Response Templates
 * Canned response library (md-19 Agent 33)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ResponseTemplates {
    constructor() {
        this.extensionName = 'JSON Formatter Pro';
        this.supportEmail = 'support@zovo.one';
        this.cwsUrl = 'https://chrome.google.com/webstore/detail/json-formatter-pro/YOUR_ID';
        this.docsUrl = 'https://zovo.one/json-formatter-pro/docs';
    }

    // =====================
    // INSTALLATION
    // =====================

    getInstallationTemplates() {
        return {
            'install-basic': {
                subject: `How to Install ${this.extensionName}`,
                body: `Thank you for your interest in ${this.extensionName}!

Here's how to install it:

1. Visit our Chrome Web Store page
2. Click "Add to Chrome"
3. Click "Add extension" in the popup
4. You'll see our icon appear in your toolbar

If you don't see the icon, click the puzzle piece icon in Chrome's toolbar and pin our extension.

Need more help? Check our documentation: ${this.docsUrl}`
            },

            'install-permissions': {
                subject: 'About Our Permissions',
                body: `Great question about our permissions!

**"Read and change data on websites"**: Required to detect and format JSON content on web pages. We never collect or store your browsing data.

**"Storage"**: Saves your settings locally on your device only.

**"Clipboard"**: Allows you to copy formatted JSON with one click.

We take privacy seriously - all processing happens locally in your browser. Our privacy policy: ${this.docsUrl}/privacy`
            },

            'install-not-appearing': {
                subject: 'Extension Not Showing',
                body: `Let's get that extension visible! Try these steps:

1. **Check if it's hidden**: Click the puzzle piece icon (Extensions) in Chrome's toolbar. Look for ${this.extensionName} and click the pin icon.

2. **Verify installation**: Go to chrome://extensions and ensure ${this.extensionName} is listed and enabled.

3. **Restart Chrome**: Close all Chrome windows completely and reopen.

4. **Clear and reinstall**: If still not working, remove the extension and reinstall from the Chrome Web Store.`
            }
        };
    }

    // =====================
    // BUG REPORTS
    // =====================

    getBugTemplates() {
        return {
            'bug-acknowledged': {
                subject: 'Bug Report Received',
                body: `Thank you for reporting this issue! We've logged it and our team is investigating.

**What you reported**: {issue_summary}
**Status**: Under investigation

We'll update you as soon as we have more information. Your report helps us improve ${this.extensionName}!`
            },

            'bug-need-info': {
                subject: 'Need More Information',
                body: `Thanks for the bug report! To help us investigate faster, could you provide:

1. **Steps to reproduce**: What exactly were you doing when this happened?
2. **Expected behavior**: What should have happened?
3. **Actual behavior**: What happened instead?
4. **URL**: Which website were you on? (if applicable)
5. **Screenshot**: A screenshot would be very helpful!

You can find your debug info at: Extension popup > Settings > Copy Debug Info`
            },

            'bug-known-issue': {
                subject: 'Known Issue - Fix Coming',
                body: `Thanks for reaching out! This is a known issue that we're actively working on.

**Status**: Fix in progress
**ETA**: {eta}

**Workaround for now**:
{workaround_steps}

We'll notify you when the fix is released. Sorry for the inconvenience!`
            },

            'bug-fixed': {
                subject: 'Bug Fixed!',
                body: `Great news! The issue you reported has been fixed in our latest update.

**What was fixed**: {fix_description}

To get the update:
1. Go to chrome://extensions
2. Enable "Developer mode" (top right)
3. Click "Update"

Or wait for Chrome's automatic update (usually within 24-48 hours).

Thank you for helping us improve ${this.extensionName}!`
            }
        };
    }

    // =====================
    // BILLING
    // =====================

    getBillingTemplates() {
        return {
            'refund-approved': {
                subject: 'Refund Processed',
                body: `Your refund has been processed.

**Amount**: {amount}
**Expected arrival**: 5-10 business days

We're sorry ${this.extensionName} didn't meet your needs. If you'd like to share what we could improve, we'd genuinely appreciate it.

You're always welcome back!`
            },

            'subscription-help': {
                subject: 'Pro Subscription Help',
                body: `Thank you for being a Pro subscriber!

**Your subscription**: {subscription_status}
**Next billing date**: {next_billing}

To manage your subscription:
1. Open ${this.extensionName}
2. Click Settings > Pro Subscription
3. Click "Manage Subscription"

Need to cancel? You can do so anytime from your account settings, and you'll keep Pro access until the end of your billing period.`
            },

            'license-activation': {
                subject: 'License Activation',
                body: `Thank you for purchasing ${this.extensionName} Pro!

To activate your license:
1. Open the extension popup
2. Click "Activate Pro"
3. Enter your license key: {license_key}
4. Click "Activate"

Your Pro features should unlock immediately. If you have any issues, just reply to this email.`
            }
        };
    }

    // =====================
    // FEATURE REQUESTS
    // =====================

    getFeatureTemplates() {
        return {
            'feature-logged': {
                subject: 'Feature Request Received',
                body: `Thanks for your feature suggestion!

**Your idea**: {feature_summary}

We've added this to our feature request list. While we can't promise when (or if) we'll implement every request, user feedback directly influences our roadmap.

Popular features often get prioritized, so if you know others who'd like this feature, encourage them to let us know too!`
            },

            'feature-planned': {
                subject: 'Great News - Your Feature is Planned!',
                body: `We're happy to share that the feature you requested is now on our roadmap!

**Feature**: {feature_name}
**Expected**: {timeline}

We'll notify you when it's released. Thanks for helping shape ${this.extensionName}!`
            },

            'feature-released': {
                subject: 'Your Feature Request is Now Live!',
                body: `The feature you requested has been released!

**New feature**: {feature_name}
**How to use it**: {usage_instructions}

Update your extension to get the latest version. We hope you love it!`
            }
        };
    }

    // =====================
    // UTILITIES
    // =====================

    getTemplate(category, templateId) {
        const templates = {
            installation: this.getInstallationTemplates(),
            bugs: this.getBugTemplates(),
            billing: this.getBillingTemplates(),
            feature: this.getFeatureTemplates()
        };

        return templates[category]?.[templateId] || null;
    }

    fillTemplate(template, variables = {}) {
        let filled = {
            subject: template.subject,
            body: template.body
        };

        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            filled.subject = filled.subject.replace(placeholder, value);
            filled.body = filled.body.replace(new RegExp(placeholder, 'g'), value);
        }

        return filled;
    }

    getAllTemplates() {
        return {
            installation: this.getInstallationTemplates(),
            bugs: this.getBugTemplates(),
            billing: this.getBillingTemplates(),
            feature: this.getFeatureTemplates()
        };
    }
}

// Export singleton
const responseTemplates = new ResponseTemplates();
export { responseTemplates, ResponseTemplates };
