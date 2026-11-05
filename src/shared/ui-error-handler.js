/**
 * JSON Formatter Pro - UI Error Handler
 * Error capture for popup and options pages (Agent 11)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class UIErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 20;
        this.init();
    }

    init() {
        // Global error handler
        window.onerror = (message, source, lineno, colno, error) => {
            this.capture({
                type: 'ui_error',
                message,
                source: this.sanitizeSource(source),
                lineno,
                colno,
                stack: this.sanitizeStack(error?.stack)
            });
            return false; // Don't prevent default handling
        };

        // Promise rejection handler
        window.onunhandledrejection = (event) => {
            this.capture({
                type: 'ui_promise_rejection',
                message: event.reason?.message || String(event.reason),
                stack: this.sanitizeStack(event.reason?.stack)
            });
        };

        // Send errors when popup closes
        window.addEventListener('beforeunload', () => this.flush());

        console.log('[UIErrorHandler] Initialized');
    }

    capture(errorData) {
        const enrichedError = {
            ...errorData,
            timestamp: Date.now(),
            page: window.location.pathname,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
        };

        this.errors.push(enrichedError);

        // Keep limited
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        console.error('[UIErrorHandler] Captured:', errorData.type, errorData.message);
    }

    sanitizeSource(source) {
        if (!source) return 'unknown';
        return source
            .replace(/chrome-extension:\/\/[^/]+\//, '')
            .substring(0, 100);
    }

    sanitizeStack(stack) {
        if (!stack) return null;
        return stack
            .split('\n')
            .slice(0, 5)
            .map(line => line.replace(/chrome-extension:\/\/[^/]+\//, ''))
            .join('\n')
            .substring(0, 500);
    }

    async flush() {
        if (this.errors.length === 0) return;

        try {
            await chrome.runtime.sendMessage({
                action: 'REPORT_UI_ERRORS',
                payload: this.errors
            });
            this.errors = [];
        } catch (e) {
            // Service worker might be inactive, store locally
            this.storeLocally();
        }
    }

    storeLocally() {
        try {
            const stored = JSON.parse(localStorage.getItem('__jfp_errors') || '[]');
            const combined = [...stored, ...this.errors].slice(-this.maxErrors);
            localStorage.setItem('__jfp_errors', JSON.stringify(combined));
            this.errors = [];
        } catch (e) {
            // Silent fail
        }
    }

    // Get stored errors for debugging
    getErrors() {
        const local = JSON.parse(localStorage.getItem('__jfp_errors') || '[]');
        return {
            current: this.errors,
            stored: local
        };
    }

    clearErrors() {
        this.errors = [];
        localStorage.removeItem('__jfp_errors');
        console.log('[UIErrorHandler] Errors cleared');
    }
}

// Auto-initialize
const uiErrorHandler = new UIErrorHandler();
export { uiErrorHandler, UIErrorHandler };
