/**
 * JSON Formatter Pro - JSON Detector
 * Content script for detecting and enhancing JSON pages
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

(function () {
    'use strict';

    // Avoid running multiple times
    if (window.__jsonFormatterProLoaded) return;
    window.__jsonFormatterProLoaded = true;

    /**
     * Check if the current page contains raw JSON
     */
    function detectJSON() {
        // Check content type if available
        const contentType = document.contentType || '';
        if (contentType.includes('application/json')) {
            return true;
        }

        // Check if URL ends with .json
        if (location.pathname.endsWith('.json')) {
            return true;
        }

        // Check if body contains only a pre element with JSON-like content
        const body = document.body;
        if (!body) return false;

        const pre = body.querySelector('pre');
        if (pre && body.children.length === 1) {
            const text = pre.textContent.trim();
            if ((text.startsWith('{') && text.endsWith('}')) ||
                (text.startsWith('[') && text.endsWith(']'))) {
                try {
                    JSON.parse(text);
                    return true;
                } catch (e) {
                    return false;
                }
            }
        }

        return false;
    }

    /**
     * Get the JSON content from the page
     */
    function getJSONContent() {
        const pre = document.body.querySelector('pre');
        if (pre) {
            return pre.textContent;
        }
        return document.body.textContent;
    }

    /**
     * Inject a floating button to format the JSON
     */
    function injectFormatButton() {
        // Create container
        const container = document.createElement('div');
        container.id = 'json-formatter-pro-overlay';
        container.innerHTML = `
      <style>
        #json-formatter-pro-overlay {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #json-formatter-pro-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #7C3AED, #6D28D9);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
          transition: all 0.2s ease;
        }
        
        #json-formatter-pro-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.5);
        }
        
        #json-formatter-pro-btn svg {
          width: 16px;
          height: 16px;
        }
        
        .jfp-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: #18181b;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 13px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 999999;
        }
        
        .jfp-toast.show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      </style>
      
      <button id="json-formatter-pro-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
        </svg>
        Format with JSON Formatter Pro
      </button>
    `;

        document.body.appendChild(container);

        // Handle click
        document.getElementById('json-formatter-pro-btn').addEventListener('click', formatPage);
    }

    /**
     * Format and beautify the JSON on the page
     */
    function formatPage() {
        try {
            const content = getJSONContent();
            const data = JSON.parse(content);
            const formatted = JSON.stringify(data, null, 2);

            // Replace page content with formatted JSON
            const pre = document.body.querySelector('pre') || document.createElement('pre');
            pre.textContent = formatted;
            pre.style.cssText = `
        margin: 0;
        padding: 20px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 13px;
        line-height: 1.6;
        background: #0a0a0b;
        color: #fafafa;
        white-space: pre-wrap;
        word-wrap: break-word;
      `;

            document.body.innerHTML = '';
            document.body.style.cssText = 'margin: 0; padding: 0; background: #0a0a0b;';
            document.body.appendChild(pre);

            // Apply syntax highlighting
            applySyntaxHighlighting(pre);

            // Re-inject the button
            injectFormatButton();

            showToast('Formatted! ✓');
        } catch (e) {
            showToast('Error: ' + e.message);
        }
    }

    /**
     * Apply syntax highlighting to formatted JSON
     */
    function applySyntaxHighlighting(pre) {
        let html = pre.textContent;

        // Escape HTML
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Apply highlighting in a SINGLE pass so injected markup is never
        // re-scanned. The old chained replaces re-matched the style="color:..."
        // attributes of spans injected by an earlier replace, wrapping them
        // again and corrupting the output (stray "color: #818cf8;" literals).
        html = html.replace(
            /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"\s*:?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
            (match) => {
                let style = 'color: #fbbf24;'; // number
                if (match[0] === '"') {
                    style = /:\s*$/.test(match) ? 'color: #818cf8;' : 'color: #34d399;'; // key vs string
                } else if (match === 'true' || match === 'false') {
                    style = 'color: #f472b6;';
                } else if (match === 'null') {
                    style = 'color: #71717a; font-style: italic;';
                }
                return `<span style="${style}">${match}</span>`;
            }
        );

        pre.innerHTML = html;
    }

    /**
     * Show a toast notification
     */
    function showToast(message) {
        // Remove existing toast
        const existing = document.querySelector('.jfp-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'jfp-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // =====================
    // INITIALIZATION
    // =====================

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Only run on JSON pages
        if (detectJSON()) {
            console.log('[JSON Formatter Pro] JSON page detected');
            injectFormatButton();
        }
    }

})();
