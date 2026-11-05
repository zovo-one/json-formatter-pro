/**
 * JSON Formatter Pro - Popup Controller
 * Main UI logic for the extension popup
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class JSONFormatterPro {
    constructor() {
        // State
        this.currentView = 'editor';
        this.currentIndent = 2;
        this.isPro = false;
        this.parsedData = null;
        this.isValid = false;

        // DOM Elements
        this.elements = {};

        // Initialize
        this.init();
    }

    async init() {
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadSettings();
            await this.checkProStatus();
            this.updateLineNumbers();

            // Focus editor for immediate typing
            this.elements.jsonInput?.focus();

            // Try to auto-paste from clipboard if it looks like JSON
            await this.tryAutoPaste();

            // If editor is still empty, show sample JSON
            if (!this.elements.jsonInput.value.trim()) {
                this.loadSampleJSON();
            }

            // Track usage
            if (typeof Storage !== 'undefined') {
                Storage.trackUsage();
            }
        } catch (error) {
            console.error('[JSON Formatter Pro] Init error:', error);
        }
    }

    async tryAutoPaste() {
        try {
            // Check if auto-paste is disabled
            if (this.autoPaste === false) return;

            // Only if editor is empty and we have clipboard permission
            if (this.elements.jsonInput.value.trim()) return;

            const text = await navigator.clipboard.readText();
            if (!text || text.length > 100000) return; // Skip if empty or too large

            // Check if it looks like JSON (starts with { or [)
            const trimmed = text.trim();
            if ((trimmed.startsWith('{') || trimmed.startsWith('[')) &&
                (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
                this.elements.jsonInput.value = text;
                this.onInputChange();
                this.showToast('Pasted from clipboard', 'success');
            }
        } catch (e) {
            // Clipboard access denied or empty - that's fine
        }
    }

    loadSampleJSON() {
        const sample = {
            "welcome": "Hello from Zovo!",
            "extension": "JSON Formatter Pro",
            "version": "1.0.0",
            "features": {
                "free": [
                    "Format & beautify JSON",
                    "Minify for production",
                    "Validate syntax",
                    "Tree view explorer",
                    "Copy & download"
                ],
                "pro": [
                    "Convert to YAML",
                    "Export to CSV",
                    "Compare JSON diff",
                    "Schema validation"
                ]
            },
            "tips": {
                "tryTreeView": "Click 'Tree' above to explore this JSON!",
                "formatShortcut": "Use Ctrl+Shift+F to format",
                "settings": "Click the gear icon for settings"
            },
            "about": {
                "brand": "Zovo",
                "website": "https://zovo.one",
                "mission": "Premium developer tools, beautifully crafted"
            },
            "stats": {
                "keys": 18,
                "depth": 3,
                "size": "~650 bytes"
            }
        };

        this.elements.jsonInput.value = JSON.stringify(sample, null, 2);
        this.onInputChange();
    }

    cacheElements() {
        // Editor
        this.elements.jsonInput = document.getElementById('jsonInput');
        this.elements.lineNumbers = document.getElementById('lineNumbers');
        this.elements.editorContainer = document.getElementById('editorContainer');
        this.elements.treeContainer = document.getElementById('treeContainer');

        // Tree
        this.elements.treeView = document.getElementById('treeView');
        this.elements.treeContent = document.getElementById('treeContent');
        this.elements.treeEmpty = document.getElementById('treeEmpty');
        this.elements.treeSearch = document.getElementById('treeSearch');

        // Toolbar buttons
        this.elements.formatBtn = document.getElementById('formatBtn');
        this.elements.minifyBtn = document.getElementById('minifyBtn');
        this.elements.validateBtn = document.getElementById('validateBtn');
        this.elements.copyBtn = document.getElementById('copyBtn');
        this.elements.downloadBtn = document.getElementById('downloadBtn');
        this.elements.clearBtn = document.getElementById('clearBtn');

        // Pro buttons
        this.elements.yamlBtn = document.getElementById('yamlBtn');
        this.elements.csvBtn = document.getElementById('csvBtn');
        this.elements.diffBtn = document.getElementById('diffBtn');
        this.elements.historyBtn = document.getElementById('historyBtn');

        // View toggles
        this.elements.editorViewBtn = document.getElementById('editorViewBtn');
        this.elements.treeViewBtn = document.getElementById('treeViewBtn');

        // Status bar
        this.elements.statusValid = document.getElementById('statusValid');
        this.elements.statusText = document.getElementById('statusText');
        this.elements.statusSize = document.getElementById('statusSize');
        this.elements.statKeys = document.getElementById('statKeys');
        this.elements.statDepth = document.getElementById('statDepth');
        this.elements.indentToggle = document.getElementById('indentToggle');

        // Modal
        this.elements.proModal = document.getElementById('proModal');
        this.elements.proModalBackdrop = document.getElementById('proModalBackdrop');
        this.elements.closeProModal = document.getElementById('closeProModal');

        // License Modal
        this.elements.licenseModal = document.getElementById('licenseModal');
        this.elements.licenseModalBackdrop = document.getElementById('licenseModalBackdrop');
        this.elements.closeLicenseModal = document.getElementById('closeLicenseModal');
        this.elements.licenseKeyInput = document.getElementById('licenseKeyInput');
        this.elements.licenseError = document.getElementById('licenseError');
        this.elements.activateLicenseBtn = document.getElementById('activateLicenseBtn');

        // Settings Modal
        this.elements.settingsModal = document.getElementById('settingsModal');
        this.elements.settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
        this.elements.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.elements.themeLightBtn = document.getElementById('themeLightBtn');
        this.elements.themeDarkBtn = document.getElementById('themeDarkBtn');
        this.elements.manageLicenseBtn = document.getElementById('manageLicenseBtn');
        this.elements.proStatusText = document.getElementById('proStatusText');
        this.elements.sortKeysToggle = document.getElementById('sortKeysToggle');
        this.elements.autoPasteToggle = document.getElementById('autoPasteToggle');
        this.elements.indentBtns = document.querySelectorAll('.indent-btn');

        // Toast
        this.elements.toast = document.getElementById('toast');
        this.elements.toastMessage = document.getElementById('toastMessage');
        this.elements.toastIcon = document.getElementById('toastIcon');

        // Settings
        this.elements.settingsBtn = document.getElementById('settingsBtn');
    }

    bindEvents() {
        // Editor input
        this.elements.jsonInput?.addEventListener('input', () => this.onInputChange());
        this.elements.jsonInput?.addEventListener('scroll', () => this.syncScroll());
        this.elements.jsonInput?.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Toolbar actions
        this.elements.formatBtn?.addEventListener('click', () => this.format());
        this.elements.minifyBtn?.addEventListener('click', () => this.minify());
        this.elements.validateBtn?.addEventListener('click', () => this.validate());
        this.elements.copyBtn?.addEventListener('click', () => this.copy());
        this.elements.downloadBtn?.addEventListener('click', () => this.download());
        this.elements.clearBtn?.addEventListener('click', () => this.clear());

        // Pro features
        this.elements.yamlBtn?.addEventListener('click', () => this.convertToYAML());
        this.elements.csvBtn?.addEventListener('click', () => this.exportToCSV());
        this.elements.diffBtn?.addEventListener('click', () => this.showProModal());
        this.elements.historyBtn?.addEventListener('click', () => window.ZovoHistory.open(this));

        // View toggle
        this.elements.editorViewBtn?.addEventListener('click', () => this.switchView('editor'));
        this.elements.treeViewBtn?.addEventListener('click', () => this.switchView('tree'));

        // Status bar
        this.elements.indentToggle?.addEventListener('click', () => this.toggleIndent());

        // Modal
        this.elements.closeProModal?.addEventListener('click', () => this.hideProModal());
        this.elements.proModalBackdrop?.addEventListener('click', () => this.hideProModal());
        document.getElementById('proMaybeLater')?.addEventListener('click', (e) => { e.preventDefault(); this.hideProModal(); });

        // Tree search
        this.elements.treeSearch?.addEventListener('input', (e) => this.searchTree(e.target.value));

        // Settings
        this.elements.settingsBtn?.addEventListener('click', () => this.openSettings());

        // License Modal
        this.elements.closeLicenseModal?.addEventListener('click', () => this.hideLicenseModal());
        this.elements.licenseModalBackdrop?.addEventListener('click', () => this.hideLicenseModal());
        this.elements.activateLicenseBtn?.addEventListener('click', () => this.activateLicense());
        this.elements.licenseKeyInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.activateLicense();
        });

        // Settings Modal
        this.elements.closeSettingsModal?.addEventListener('click', () => this.hideSettingsModal());
        this.elements.settingsModalBackdrop?.addEventListener('click', () => this.hideSettingsModal());
        this.elements.themeLightBtn?.addEventListener('click', () => this.setTheme('light'));
        this.elements.themeDarkBtn?.addEventListener('click', () => this.setTheme('dark'));
        this.elements.manageLicenseBtn?.addEventListener('click', () => {
            this.hideSettingsModal();
            setTimeout(() => this.showLicenseModal(), 300);
        });

        // New settings handlers
        this.elements.sortKeysToggle?.addEventListener('change', (e) => this.setSortKeys(e.target.checked));
        this.elements.autoPasteToggle?.addEventListener('change', (e) => this.setAutoPaste(e.target.checked));
        this.elements.indentBtns?.forEach(btn => {
            btn.addEventListener('click', () => this.setIndentFromSettings(parseInt(btn.dataset.indent)));
        });
    }

    async loadSettings() {
        if (typeof Storage === 'undefined') return;

        const settings = await Storage.getAll();
        this.currentIndent = settings.indent || 2;
        this.sortKeys = settings.sortKeys || false;
        this.autoPaste = settings.autoPaste !== false; // Default true
        this.elements.indentToggle.textContent = `${this.currentIndent} spaces`;

        // Apply theme
        if (settings.theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    async checkProStatus() {
        if (typeof Storage === 'undefined') return;
        this.isPro = await Storage.checkPro();
    }

    // =====================
    // INPUT HANDLING
    // =====================

    onInputChange() {
        const input = this.elements.jsonInput.value;
        this.updateLineNumbers();
        this.updateStats(input);

        // Debounce validation - only validate after user stops typing
        clearTimeout(this.validateTimeout);
        if (input.trim()) {
            this.setStatus('ready', 'Typing...');
        }
        this.validateTimeout = setTimeout(() => {
            this.validateInput(input);
        }, 400); // 400ms delay

        // Update tree if visible
        if (this.currentView === 'tree' && this.parsedData) {
            this.renderTree(this.parsedData);
        }
    }

    validateInput(input) {
        if (!input.trim()) {
            this.setStatus('ready', 'Ready');
            this.parsedData = null;
            this.isValid = false;
            return;
        }

        const result = JSONUtils.parse(input);

        if (result.success) {
            this.parsedData = result.data;
            this.isValid = true;
            this.setStatus('valid', 'Valid JSON');
            this.clearErrorHighlight();
        } else {
            this.parsedData = null;
            this.isValid = false;
            this.setStatus('invalid', `Error at line ${result.error.line}`);
            this.highlightError(result.error.line);
        }
    }

    updateStats(input) {
        // Update size
        const size = JSONUtils.getSize(input);
        this.elements.statusSize.textContent = size;

        // Update stats if valid
        if (this.parsedData) {
            const stats = JSONUtils.getStats(this.parsedData);
            this.elements.statKeys.textContent = `${stats.keys} keys`;
            this.elements.statDepth.textContent = `Depth: ${stats.depth}`;
        } else {
            this.elements.statKeys.textContent = '0 keys';
            this.elements.statDepth.textContent = 'Depth: 0';
        }
    }

    setStatus(type, text) {
        this.elements.statusValid.className = `status-item ${type}`;
        this.elements.statusText.textContent = text;
    }

    updateLineNumbers() {
        const lines = this.elements.jsonInput.value.split('\n');
        const lineCount = lines.length;

        let html = '';
        for (let i = 1; i <= lineCount; i++) {
            html += `<div class="line">${i}</div>`;
        }

        this.elements.lineNumbers.innerHTML = html;
    }

    syncScroll() {
        this.elements.lineNumbers.scrollTop = this.elements.jsonInput.scrollTop;
    }

    highlightError(lineNumber) {
        const lineElements = this.elements.lineNumbers.querySelectorAll('.line');
        lineElements.forEach((el, index) => {
            if (index + 1 === lineNumber) {
                el.classList.add('error');
            } else {
                el.classList.remove('error');
            }
        });
    }

    clearErrorHighlight() {
        const lineElements = this.elements.lineNumbers.querySelectorAll('.line');
        lineElements.forEach(el => el.classList.remove('error'));
    }

    handleKeydown(e) {
        // Tab is left as normal focus movement so keyboard users are never
        // trapped in the editor (WCAG 2.1.2). The old Tab-inserts-spaces trap
        // meant Tab never moved focus out of the textarea. Indentation is
        // handled by Format (and the indent setting), so nothing is lost.

        // Ctrl/Cmd + Shift + F - Format
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            this.format();
        }
    }

    // =====================
    // CORE ACTIONS
    // =====================

    format() {
        const input = this.elements.jsonInput.value;
        if (!input.trim()) {
            this.showToast('Nothing to format', 'error');
            return;
        }

        const result = JSONUtils.parse(input);

        if (result.success) {
            const formatted = JSONUtils.format(result.data, { indent: this.currentIndent, sortKeys: !!this.sortKeys });
            this.elements.jsonInput.value = formatted;
            this.onInputChange();
            this.showToast('Formatted!', 'success');

            // Add to history
            if (typeof Storage !== 'undefined') {
                Storage.addToHistory(formatted);
            }
        } else {
            // Friendlier error message
            this.showToast(`Fix error on line ${result.error.line} and try again`, 'error');
        }
    }

    minify() {
        const input = this.elements.jsonInput.value;
        if (!input.trim()) {
            this.showToast('Nothing to minify', 'error');
            return;
        }

        const result = JSONUtils.parse(input);

        if (result.success) {
            const minified = JSONUtils.minify(result.data);
            this.elements.jsonInput.value = minified;
            this.onInputChange();
            this.showToast('Minified!', 'success');
        } else {
            this.showToast(`Invalid JSON: ${result.error.message}`, 'error');
        }
    }

    validate() {
        const input = this.elements.jsonInput.value;
        if (!input.trim()) {
            this.showToast('Enter JSON to validate', 'error');
            return;
        }

        const result = JSONUtils.parse(input);

        if (result.success) {
            const stats = JSONUtils.getStats(result.data);
            this.showToast(`Valid JSON! ${stats.keys} keys, depth ${stats.depth}`, 'success');
        } else {
            this.showToast(`Invalid: Line ${result.error.line}, Column ${result.error.column}`, 'error');
        }
    }

    async copy() {
        const input = this.elements.jsonInput.value;
        if (!input.trim()) {
            this.showToast('Nothing to copy', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(input);
            this.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            this.showToast('Failed to copy', 'error');
        }
    }

    download() {
        const input = this.elements.jsonInput.value;
        if (!input.trim()) {
            this.showToast('Nothing to download', 'error');
            return;
        }

        const blob = new Blob([input], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `formatted-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Downloaded!', 'success');
    }

    clear() {
        this.elements.jsonInput.value = '';
        this.onInputChange();
        this.elements.treeContent.innerHTML = '';
        this.elements.treeEmpty.style.display = 'flex';
    }

    // =====================
    // PRO FEATURES (API-based)
    // =====================

    async convertToYAML() {
        // Check for license key first
        if (!window.ZovoAPI) {
            this.showProModal();
            return;
        }

        const licenseKey = await window.ZovoAPI.getLicenseKey();
        if (!licenseKey) {
            this.showLicenseModal();
            return;
        }

        if (!this.parsedData) {
            this.showToast('Enter valid JSON first', 'error');
            return;
        }

        this.showToast('Converting...', 'success');

        try {
            const { status, data } = await window.ZovoAPI.convertToYAML(this.parsedData);

            if (status === 401) {
                this.showLicenseModal();
                return;
            }

            if (status === 403) {
                this.showProModal();
                return;
            }

            if (status === 0) {
                this.showToast('Network error. Check connection.', 'error');
                return;
            }

            if (status === 200 && data.success) {
                this.elements.jsonInput.value = data.result;
                this.updateLineNumbers();
                this.showToast('Converted to YAML!', 'success');
            } else {
                this.showToast(data.error || 'Conversion failed', 'error');
            }
        } catch (err) {
            this.showToast('Conversion failed: ' + err.message, 'error');
        }
    }

    async exportToCSV() {
        // Check for license key first
        if (!window.ZovoAPI) {
            this.showProModal();
            return;
        }

        const licenseKey = await window.ZovoAPI.getLicenseKey();
        if (!licenseKey) {
            this.showLicenseModal();
            return;
        }

        if (!this.parsedData) {
            this.showToast('Enter valid JSON first', 'error');
            return;
        }

        if (!Array.isArray(this.parsedData)) {
            this.showToast('JSON must be an array for CSV export', 'error');
            return;
        }

        this.showToast('Exporting...', 'success');

        try {
            const { status, data } = await window.ZovoAPI.exportToCSV(this.parsedData);

            if (status === 401) {
                this.showLicenseModal();
                return;
            }

            if (status === 403) {
                this.showProModal();
                return;
            }

            if (status === 0) {
                this.showToast('Network error. Check connection.', 'error');
                return;
            }

            if (status === 200 && data.success) {
                const blob = new Blob([data.result], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `export-${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showToast('Exported to CSV!', 'success');
            } else {
                this.showToast(data.error || 'Export failed', 'error');
            }
        } catch (err) {
            this.showToast('Export failed: ' + err.message, 'error');
        }
    }

    // =====================
    // VIEW SWITCHING
    // =====================

    switchView(view) {
        this.currentView = view;

        // Update buttons
        this.elements.editorViewBtn.classList.toggle('active', view === 'editor');
        this.elements.treeViewBtn.classList.toggle('active', view === 'tree');

        // Update containers
        this.elements.editorContainer.classList.toggle('active', view === 'editor');
        this.elements.treeContainer.classList.toggle('active', view === 'tree');

        // Render tree if switching to tree view
        if (view === 'tree') {
            if (this.parsedData) {
                this.renderTree(this.parsedData);
                this.elements.treeEmpty.style.display = 'none';
            } else {
                this.elements.treeContent.innerHTML = '';
                this.elements.treeEmpty.style.display = 'flex';
            }
        }
    }

    // =====================
    // TREE VIEW
    // =====================

    renderTree(data, container = null, path = '') {
        const target = container || this.elements.treeContent;

        if (!container) {
            target.innerHTML = '';
        }

        if (data === null) {
            target.innerHTML = '<span class="tree-value null">null</span>';
            return;
        }

        if (typeof data !== 'object') {
            const type = typeof data;
            target.innerHTML = `<span class="tree-value ${type}">${this.escapeHTML(String(data))}</span>`;
            return;
        }

        const isArray = Array.isArray(data);
        const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);

        entries.forEach(([key, value], index) => {
            // Array elements use bracket notation to match JSONUtils.search,
            // which returns `path[i]`. Dot notation here broke tree search for
            // any node inside an array.
            const nodePath = isArray
                ? `${path}[${key}]`
                : (path ? `${path}.${key}` : String(key));
            const node = document.createElement('div');
            node.className = 'tree-node';
            node.dataset.path = nodePath;

            const isExpandable = value !== null && typeof value === 'object';
            const preview = this.getPreview(value);

            const row = document.createElement('div');
            row.className = 'tree-node-row';

            if (isExpandable) {
                row.innerHTML = `
          <span class="tree-toggle expanded">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="tree-key">${isArray ? `[${key}]` : this.escapeHTML(String(key))}</span>
          <span class="tree-colon">:</span>
          <span class="tree-preview">${preview}</span>
        `;

                const children = document.createElement('div');
                children.className = 'tree-children';
                this.renderTree(value, children, nodePath);

                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const toggle = row.querySelector('.tree-toggle');
                    const isExpanded = toggle.classList.contains('expanded');
                    toggle.classList.toggle('expanded', !isExpanded);
                    children.classList.toggle('collapsed', isExpanded);
                });

                node.appendChild(row);
                node.appendChild(children);
            } else {
                const valueType = value === null ? 'null' : typeof value;
                const displayValue = value === null ? 'null' :
                    typeof value === 'string' ? `"${this.escapeHTML(value)}"` : String(value);

                row.innerHTML = `
          <span class="tree-toggle" style="visibility: hidden;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="tree-key">${isArray ? `[${key}]` : this.escapeHTML(String(key))}</span>
          <span class="tree-colon">:</span>
          <span class="tree-value ${valueType}">${displayValue}</span>
        `;

                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Copy value on click
                    navigator.clipboard.writeText(String(value));
                    this.showToast('Value copied!', 'success');
                });

                node.appendChild(row);
            }

            target.appendChild(node);
        });
    }

    getPreview(value) {
        if (Array.isArray(value)) {
            return `Array(${value.length})`;
        }
        if (typeof value === 'object' && value !== null) {
            const keys = Object.keys(value);
            return `{${keys.length} keys}`;
        }
        return '';
    }

    searchTree(query) {
        if (!query.trim()) {
            // Show all nodes
            this.elements.treeContent.querySelectorAll('.tree-node').forEach(node => {
                node.style.display = '';
            });
            return;
        }

        if (!this.parsedData) return;

        const results = JSONUtils.search(this.parsedData, query);
        const matchingPaths = new Set(results.map(r => r.path));

        this.elements.treeContent.querySelectorAll('.tree-node').forEach(node => {
            const path = node.dataset.path;
            const matches = [...matchingPaths].some(mp => mp.startsWith(path) || path.startsWith(mp));
            node.style.display = matches ? '' : 'none';
        });
    }

    // =====================
    // SETTINGS
    // =====================

    toggleIndent() {
        const indents = [2, 4, 8];
        const currentIndex = indents.indexOf(this.currentIndent);
        this.currentIndent = indents[(currentIndex + 1) % indents.length];
        this.elements.indentToggle.textContent = `${this.currentIndent} spaces`;

        // Save setting
        if (typeof Storage !== 'undefined') {
            Storage.set('indent', this.currentIndent);
        }

        // Re-format if valid
        if (this.isValid) {
            this.format();
        }
    }

    openSettings() {
        this.showSettingsModal();
    }

    showSettingsModal() {
        if (this.elements.settingsModal) {
            // Update theme buttons
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            this.elements.themeLightBtn?.classList.toggle('active', currentTheme === 'light');
            this.elements.themeDarkBtn?.classList.toggle('active', currentTheme === 'dark');

            // Update Pro status
            this.updateProStatusDisplay();

            this.elements.settingsModal.hidden = false;
            setTimeout(() => {
                this.elements.settingsModal.classList.add('show');
            }, 10);

            // Update indent buttons
            this.elements.indentBtns?.forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.indent) === this.currentIndent);
            });

            // Update toggles
            if (this.elements.sortKeysToggle) {
                this.elements.sortKeysToggle.checked = this.sortKeys || false;
            }
            if (this.elements.autoPasteToggle) {
                this.elements.autoPasteToggle.checked = this.autoPaste !== false;
            }
        }
    }

    hideSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.remove('show');
            setTimeout(() => {
                this.elements.settingsModal.hidden = true;
            }, 300);
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.elements.themeLightBtn?.classList.toggle('active', theme === 'light');
        this.elements.themeDarkBtn?.classList.toggle('active', theme === 'dark');

        if (typeof Storage !== 'undefined') {
            Storage.set('theme', theme);
        }
    }

    setIndentFromSettings(indent) {
        this.currentIndent = indent;
        this.elements.indentToggle.textContent = `${this.currentIndent} spaces`;

        // Update buttons
        this.elements.indentBtns?.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.indent) === indent);
        });

        if (typeof Storage !== 'undefined') {
            Storage.set('indent', indent);
        }

        // Re-format if valid
        if (this.isValid) {
            this.format();
        }
    }

    setSortKeys(enabled) {
        this.sortKeys = enabled;
        if (typeof Storage !== 'undefined') {
            Storage.set('sortKeys', enabled);
        }
    }

    setAutoPaste(enabled) {
        this.autoPaste = enabled;
        if (typeof Storage !== 'undefined') {
            Storage.set('autoPaste', enabled);
        }
    }

    async updateProStatusDisplay() {
        if (window.ZovoAPI) {
            const key = await window.ZovoAPI.getLicenseKey();
            if (key) {
                this.elements.proStatusText.textContent = 'Active - ' + window.ZovoAPI.maskLicenseKey(key);
                this.elements.proStatusText.style.color = 'var(--success)';
                this.elements.manageLicenseBtn.textContent = 'Change Key';
            } else {
                this.elements.proStatusText.textContent = 'Not activated';
                this.elements.proStatusText.style.color = '';
                this.elements.manageLicenseBtn.textContent = 'Enter Key';
            }
        }
    }

    // =====================
    // MODAL
    // =====================

    showProModal() {
        this.elements.proModal.hidden = false;
        setTimeout(() => {
            this.elements.proModal.classList.add('show');
        }, 10);
    }

    hideProModal() {
        this.elements.proModal.classList.remove('show');
        setTimeout(() => {
            this.elements.proModal.hidden = true;
        }, 300);
    }

    // =====================
    // LICENSE MODAL
    // =====================

    showLicenseModal() {
        if (this.elements.licenseModal) {
            this.elements.licenseModal.hidden = false;
            this.elements.licenseError.hidden = true;
            this.elements.licenseKeyInput.value = '';
            setTimeout(() => {
                this.elements.licenseModal.classList.add('show');
                this.elements.licenseKeyInput?.focus();
            }, 10);
        }
    }

    hideLicenseModal() {
        if (this.elements.licenseModal) {
            this.elements.licenseModal.classList.remove('show');
            setTimeout(() => {
                this.elements.licenseModal.hidden = true;
            }, 300);
        }
    }

    async activateLicense() {
        const key = this.elements.licenseKeyInput?.value?.trim();

        if (!key) {
            this.elements.licenseError.textContent = 'Please enter a license key';
            this.elements.licenseError.hidden = false;
            return;
        }

        // Validate format (ZOVO-XXXX-XXXX-XXXX-XXXX)
        const keyFormat = /^ZOVO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
        if (!keyFormat.test(key)) {
            this.elements.licenseError.textContent = 'Invalid key format. Expected: ZOVO-XXXX-XXXX-XXXX-XXXX';
            this.elements.licenseError.hidden = false;
            return;
        }

        // Show loading state
        this.elements.activateLicenseBtn.classList.add('btn-loading');
        this.elements.activateLicenseBtn.disabled = true;

        try {
            // Save key first
            await window.ZovoAPI.setLicenseKey(key.toUpperCase());

            // Verify with server
            const result = await window.ZovoAPI.verifyLicense();

            if (result.valid && result.is_pro) {
                this.isPro = true;
                this.hideLicenseModal();
                this.showToast('Pro activated', 'success');
            } else if (result.reason === 'INVALID_KEY') {
                await window.ZovoAPI.clearLicenseKey();
                this.elements.licenseError.textContent = 'Invalid or expired license key';
                this.elements.licenseError.hidden = false;
            } else if (result.reason === 'NETWORK_ERROR') {
                // Key saved locally, will verify on next use
                this.isPro = true;
                this.hideLicenseModal();
                this.showToast('Key saved. Will verify on next use.', 'success');
            } else {
                this.elements.licenseError.textContent = 'Could not verify license. Try again.';
                this.elements.licenseError.hidden = false;
            }
        } catch (error) {
            console.error('[License] Activation error:', error);
            this.elements.licenseError.textContent = 'Activation failed. Try again.';
            this.elements.licenseError.hidden = false;
        } finally {
            this.elements.activateLicenseBtn.classList.remove('btn-loading');
            this.elements.activateLicenseBtn.disabled = false;
        }
    }

    // =====================
    // TOAST
    // =====================

    showToast(message, type = 'success') {
        const successIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;
        const errorIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`;

        this.elements.toast.className = `toast ${type}`;
        this.elements.toastIcon.innerHTML = type === 'success' ? successIcon : errorIcon;
        this.elements.toastMessage.textContent = message;
        this.elements.toast.hidden = false;

        setTimeout(() => {
            this.elements.toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            this.elements.toast.classList.remove('show');
            setTimeout(() => {
                this.elements.toast.hidden = true;
            }, 300);
        }, 2500);
    }

    // =====================
    // UTILITIES
    // =====================

    escapeHTML(str) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return str.replace(/[&<>"']/g, char => escapeMap[char]);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new JSONFormatterPro();
});
