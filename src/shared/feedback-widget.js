/**
 * JSON Formatter Pro - Feedback Widget
 * In-extension feedback system (md-19 Agent 31)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class FeedbackWidget {
    constructor() {
        this.FEEDBACK_ENDPOINT = 'https://api.zovo.one/feedback';
        this.extensionId = chrome.runtime.id;
        this.extensionVersion = chrome.runtime.getManifest().version;
    }

    // =====================
    // SYSTEM INFO
    // =====================

    async collectSystemInfo() {
        const { subscription = {} } = await chrome.storage.local.get('subscription');
        const { engagementData = {} } = await chrome.storage.local.get('engagementData');

        return {
            browser: navigator.userAgent.substring(0, 200),
            platform: navigator.platform,
            language: navigator.language,
            extensionVersion: this.extensionVersion,
            extensionId: this.extensionId,
            screenResolution: `${screen.width}x${screen.height}`,
            tier: subscription.tier || 'free',
            totalActions: engagementData.totalActions || 0,
            timestamp: new Date().toISOString()
        };
    }

    // =====================
    // FEEDBACK SUBMISSION
    // =====================

    async submitFeedback(data) {
        const systemInfo = await this.collectSystemInfo();

        const payload = {
            type: data.type, // 'bug', 'feature', 'question', 'other'
            subject: data.subject || '',
            message: data.message,
            email: data.email || null,
            rating: data.rating || null,
            systemInfo,
            source: 'extension'
        };

        // Store locally in case submission fails
        await this.storeFeedbackLocally(payload);

        try {
            // Attempt to send to API
            const response = await fetch(this.FEEDBACK_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await this.clearLocalFeedback(payload.timestamp);
                return { success: true };
            }
        } catch (error) {
            console.warn('[FeedbackWidget] Could not reach server, saved locally');
        }

        return { success: true, offline: true };
    }

    async storeFeedbackLocally(feedback) {
        const { pendingFeedback = [] } = await chrome.storage.local.get('pendingFeedback');
        pendingFeedback.push(feedback);

        // Keep only last 10
        const trimmed = pendingFeedback.slice(-10);
        await chrome.storage.local.set({ pendingFeedback: trimmed });
    }

    async clearLocalFeedback(timestamp) {
        const { pendingFeedback = [] } = await chrome.storage.local.get('pendingFeedback');
        const filtered = pendingFeedback.filter(f => f.systemInfo?.timestamp !== timestamp);
        await chrome.storage.local.set({ pendingFeedback: filtered });
    }

    async retryPendingFeedback() {
        const { pendingFeedback = [] } = await chrome.storage.local.get('pendingFeedback');

        for (const feedback of pendingFeedback) {
            try {
                const response = await fetch(this.FEEDBACK_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(feedback)
                });

                if (response.ok) {
                    await this.clearLocalFeedback(feedback.systemInfo?.timestamp);
                }
            } catch (e) {
                // Still offline, try again later
                break;
            }
        }
    }

    // =====================
    // FEEDBACK TYPES
    // =====================

    getFeedbackTypes() {
        return [
            { id: 'bug', label: 'Report Bug', icon: '🐛' },
            { id: 'feature', label: 'Feature Request', icon: '💡' },
            { id: 'question', label: 'Question', icon: '❓' },
            { id: 'praise', label: 'Feedback', icon: '⭐' },
            { id: 'other', label: 'Other', icon: '📝' }
        ];
    }

    // =====================
    // DEBUG INFO
    // =====================

    async getDebugInfo() {
        const systemInfo = await this.collectSystemInfo();
        const { usageHistory = [] } = await chrome.storage.local.get('usageHistory');
        const { errorSummary = {} } = await chrome.storage.local.get('errorSummary');

        return {
            ...systemInfo,
            recentUsage: usageHistory.slice(-7),
            recentErrors: errorSummary.last7Days || 0,
            chromeVersion: this.getChromeVersion()
        };
    }

    getChromeVersion() {
        const match = navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
        return match ? match[1] : 'unknown';
    }

    // =====================
    // UI GENERATION
    // =====================

    generateWidgetHTML() {
        return `
      <div id="jfp-feedback-widget" class="jfp-feedback-container">
        <button id="jfp-feedback-toggle" class="jfp-feedback-btn">
          💬 Feedback
        </button>
        <div id="jfp-feedback-form" class="jfp-feedback-form hidden">
          <div class="jfp-feedback-header">
            <span>Send Feedback</span>
            <button id="jfp-feedback-close">×</button>
          </div>
          <select id="jfp-feedback-type">
            <option value="bug">🐛 Report Bug</option>
            <option value="feature">💡 Feature Request</option>
            <option value="question">❓ Question</option>
            <option value="other">📝 Other</option>
          </select>
          <textarea id="jfp-feedback-message" 
            placeholder="Describe your feedback..." 
            rows="4"></textarea>
          <input type="email" id="jfp-feedback-email" 
            placeholder="Email (optional, for response)">
          <button id="jfp-feedback-submit" class="jfp-submit-btn">
            Send Feedback
          </button>
        </div>
      </div>
    `;
    }

    generateWidgetCSS() {
        return `
      .jfp-feedback-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .jfp-feedback-btn {
        background: #7c3aed;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(124,58,237,0.3);
      }
      .jfp-feedback-btn:hover {
        background: #6d28d9;
      }
      .jfp-feedback-form {
        background: white;
        border-radius: 12px;
        padding: 16px;
        width: 300px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        margin-bottom: 10px;
      }
      .jfp-feedback-form.hidden {
        display: none;
      }
      .jfp-feedback-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-weight: 600;
      }
      .jfp-feedback-form select,
      .jfp-feedback-form textarea,
      .jfp-feedback-form input {
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .jfp-submit-btn {
        width: 100%;
        background: #7c3aed;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
      }
    `;
    }
}

// Export singleton
const feedbackWidget = new FeedbackWidget();
export { feedbackWidget, FeedbackWidget };
