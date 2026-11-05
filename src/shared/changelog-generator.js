/**
 * JSON Formatter Pro - Changelog Generator
 * Automated changelog management (md-22 Agent 49)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ChangelogGenerator {
    constructor() {
        this.STORAGE_KEY = 'changelog';
    }

    // =====================
    // CHANGELOG ENTRIES
    // =====================

    createEntry(version, options = {}) {
        return {
            version,
            date: options.date || new Date().toISOString().split('T')[0],
            type: options.type || 'release',
            changes: {
                added: options.added || [],
                changed: options.changed || [],
                fixed: options.fixed || [],
                removed: options.removed || [],
                security: options.security || [],
                deprecated: options.deprecated || []
            },
            highlights: options.highlights || [],
            breakingChanges: options.breakingChanges || []
        };
    }

    // =====================
    // CURRENT VERSION CHANGELOG
    // =====================

    getCurrentChangelog() {
        // Hardcoded for the current version
        return this.createEntry('1.0.0', {
            date: '2026-02-05',
            type: 'release',
            added: [
                'JSON formatting and beautification',
                'JSON minification',
                'Syntax validation with error highlighting',
                'Tree view for JSON exploration',
                'Copy to clipboard functionality',
                'Dark and light themes',
                'Keyboard shortcuts for power users',
                'Pro features: YAML/CSV export, JSON Schema validation',
                'Pro features: Side-by-side JSON diff'
            ],
            changed: [],
            fixed: [],
            highlights: [
                'First public release',
                'Built with performance in mind',
                'Privacy-first: all processing happens locally'
            ]
        });
    }

    // =====================
    // CHANGELOG PERSISTENCE
    // =====================

    async saveChangelog(entries) {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: entries });
    }

    async getChangelog() {
        const { changelog = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
        return changelog;
    }

    async addEntry(entry) {
        const changelog = await this.getChangelog();
        changelog.unshift(entry);
        await this.saveChangelog(changelog);
        return changelog;
    }

    // =====================
    // FORMATTING
    // =====================

    formatAsMarkdown(entries) {
        let md = '# Changelog\n\n';
        md += 'All notable changes to this project will be documented in this file.\n\n';

        for (const entry of entries) {
            md += `## [${entry.version}] - ${entry.date}\n\n`;

            if (entry.highlights.length > 0) {
                md += '### Highlights\n';
                for (const highlight of entry.highlights) {
                    md += `- ${highlight}\n`;
                }
                md += '\n';
            }

            if (entry.breakingChanges.length > 0) {
                md += '### ⚠️ Breaking Changes\n';
                for (const change of entry.breakingChanges) {
                    md += `- ${change}\n`;
                }
                md += '\n';
            }

            const sections = [
                { key: 'added', title: 'Added' },
                { key: 'changed', title: 'Changed' },
                { key: 'fixed', title: 'Fixed' },
                { key: 'removed', title: 'Removed' },
                { key: 'security', title: 'Security' },
                { key: 'deprecated', title: 'Deprecated' }
            ];

            for (const section of sections) {
                const items = entry.changes[section.key];
                if (items && items.length > 0) {
                    md += `### ${section.title}\n`;
                    for (const item of items) {
                        md += `- ${item}\n`;
                    }
                    md += '\n';
                }
            }
        }

        return md;
    }

    formatAsHTML(entries) {
        let html = '<div class="changelog">';

        for (const entry of entries) {
            html += `<section class="changelog-entry">`;
            html += `<h2>Version ${entry.version} <span class="date">${entry.date}</span></h2>`;

            if (entry.highlights.length > 0) {
                html += '<div class="highlights">';
                html += '<h3>Highlights</h3><ul>';
                for (const h of entry.highlights) {
                    html += `<li>${this.escapeHtml(h)}</li>`;
                }
                html += '</ul></div>';
            }

            for (const [key, items] of Object.entries(entry.changes)) {
                if (items.length > 0) {
                    html += `<div class="changes-${key}">`;
                    html += `<h3>${this.capitalize(key)}</h3><ul>`;
                    for (const item of items) {
                        html += `<li>${this.escapeHtml(item)}</li>`;
                    }
                    html += '</ul></div>';
                }
            }

            html += '</section>';
        }

        html += '</div>';
        return html;
    }

    formatForPopup(entry) {
        const allChanges = [
            ...entry.changes.added.map(c => ({ type: 'added', text: c })),
            ...entry.changes.changed.map(c => ({ type: 'changed', text: c })),
            ...entry.changes.fixed.map(c => ({ type: 'fixed', text: c }))
        ];

        return {
            version: entry.version,
            date: entry.date,
            highlights: entry.highlights,
            changes: allChanges.slice(0, 5),
            totalChanges: allChanges.length
        };
    }

    // =====================
    // UTILITIES
    // =====================

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // =====================
    // COMPARISON
    // =====================

    getChangesSince(version, entries) {
        const allChanges = {
            added: [],
            changed: [],
            fixed: [],
            removed: [],
            security: [],
            deprecated: []
        };

        for (const entry of entries) {
            if (this.compareVersions(entry.version, version) > 0) {
                for (const [key, items] of Object.entries(entry.changes)) {
                    allChanges[key].push(...items);
                }
            }
        }

        return allChanges;
    }

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const a = parts1[i] || 0;
            const b = parts2[i] || 0;
            if (a > b) return 1;
            if (a < b) return -1;
        }
        return 0;
    }
}

// Export singleton
const changelogGenerator = new ChangelogGenerator();
export { changelogGenerator, ChangelogGenerator };
