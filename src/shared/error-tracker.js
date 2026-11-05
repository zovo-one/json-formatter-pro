/**
 * JSON Formatter Pro - Error Tracker
 * Crash analytics and runtime monitoring (Agent 11)
 * 
 * Features:
 * - Global error capture for service worker
 * - Unhandled promise rejection tracking
 * - Error queue with batched reporting
 * - Local-only storage (privacy-first)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ErrorTracker {
    constructor(options = {}) {
        this.queue = [];
        this.maxQueueSize = options.maxQueueSize || 25;
        this.extensionId = chrome.runtime.id;
        this.version = chrome.runtime.getManifest().version;
        this.sessionId = this.generateSessionId();

        this.init();
    }

    init() {
        // Global error handler for service worker
        self.addEventListener('error', (event) => {
            this.captureError({
                type: 'uncaught_error',
                message: event.message,
                filename: this.sanitizeFilename(event.filename),
                lineno: event.lineno,
                colno: event.colno,
                stack: this.sanitizeStack(event.error?.stack)
            });
        });

        // Unhandled promise rejection handler
        self.addEventListener('unhandledrejection', (event) => {
            this.captureError({
                type: 'unhandled_rejection',
                message: event.reason?.message || String(event.reason),
                stack: this.sanitizeStack(event.reason?.stack)
            });
        });

        // Process any pending errors on startup
        this.processPendingErrors();

        console.log('[ErrorTracker] Initialized for JSON Formatter Pro');
    }

    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    captureError(errorData) {
        const enrichedError = {
            ...errorData,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            context: {
                version: this.version,
                platform: navigator.platform,
                language: navigator.language,
                userAgent: navigator.userAgent.substring(0, 100)
            }
        };

        this.queue.push(enrichedError);

        // Keep queue limited
        if (this.queue.length > this.maxQueueSize) {
            this.queue.shift();
        }

        // Persist to storage
        this.persistErrors();

        console.error('[ErrorTracker] Captured:', errorData.type, errorData.message);
    }

    async persistErrors() {
        try {
            const { errorLogs = [] } = await chrome.storage.local.get('errorLogs');

            // Merge and dedupe
            const combined = [...errorLogs, ...this.queue]
                .slice(-this.maxQueueSize);

            await chrome.storage.local.set({ errorLogs: combined });
            this.queue = [];
        } catch (e) {
            console.warn('[ErrorTracker] Failed to persist errors:', e);
        }
    }

    async processPendingErrors() {
        try {
            const { pendingErrors = [] } = await chrome.storage.local.get('pendingErrors');
            if (pendingErrors.length > 0) {
                pendingErrors.forEach(err => this.captureError(err));
                await chrome.storage.local.remove('pendingErrors');
            }
        } catch (e) {
            // Silent fail
        }
    }

    sanitizeFilename(filename) {
        if (!filename) return 'unknown';
        // Remove extension ID from path for readability
        return filename
            .replace(`chrome-extension://${this.extensionId}/`, '')
            .substring(0, 100);
    }

    sanitizeStack(stack) {
        if (!stack) return null;
        return stack
            .split('\n')
            .slice(0, 5)
            .map(line => line.replace(`chrome-extension://${this.extensionId}/`, ''))
            .join('\n')
            .substring(0, 500);
    }

    // Get error summary for debugging
    async getErrorSummary() {
        const { errorLogs = [] } = await chrome.storage.local.get('errorLogs');

        const byType = {};
        errorLogs.forEach(err => {
            byType[err.type] = (byType[err.type] || 0) + 1;
        });

        return {
            total: errorLogs.length,
            byType,
            recent: errorLogs.slice(-5),
            version: this.version
        };
    }

    // Clear all error logs
    async clearErrors() {
        await chrome.storage.local.remove(['errorLogs', 'pendingErrors']);
        this.queue = [];
        console.log('[ErrorTracker] Errors cleared');
    }
}

// Export singleton instance
const errorTracker = new ErrorTracker();
export { errorTracker, ErrorTracker };
