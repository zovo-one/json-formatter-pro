/**
 * JSON Formatter Pro - Core JSON Utilities
 * All processing happens locally. No data ever leaves the browser.
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

const JSONUtils = {
    /**
     * Parse JSON with detailed error reporting
     * @param {string} input - Raw JSON string
     * @returns {{ success: boolean, data?: any, error?: { message: string, line: number, column: number, position: number } }}
     */
    parse(input) {
        if (!input || typeof input !== 'string') {
            return {
                success: false,
                error: {
                    message: 'Input must be a non-empty string',
                    line: 1,
                    column: 1,
                    position: 0
                }
            };
        }

        try {
            const data = JSON.parse(input);
            return { success: true, data };
        } catch (e) {
            const match = e.message.match(/position (\d+)/);
            const position = match ? parseInt(match[1]) : 0;
            const { line, column } = this.getLineColumn(input, position);

            return {
                success: false,
                error: {
                    message: e.message,
                    line,
                    column,
                    position
                }
            };
        }
    },

    /**
     * Convert character position to line/column
     * @param {string} str - Input string
     * @param {number} position - Character position
     * @returns {{ line: number, column: number }}
     */
    getLineColumn(str, position) {
        const lines = str.substring(0, position).split('\n');
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1
        };
    },

    /**
     * Format JSON with options
     * @param {any} data - Parsed JSON data
     * @param {Object} options - Formatting options
     * @param {number} [options.indent=2] - Indentation spaces
     * @param {boolean} [options.sortKeys=false] - Sort object keys alphabetically
     * @returns {string}
     */
    format(data, options = {}) {
        const { indent = 2, sortKeys = false } = options;

        let processedData = data;
        if (sortKeys) {
            processedData = this.sortKeysDeep(data);
        }

        return JSON.stringify(processedData, null, indent);
    },

    /**
     * Minify JSON to single line
     * @param {any} data - Parsed JSON data
     * @returns {string}
     */
    minify(data) {
        return JSON.stringify(data);
    },

    /**
     * Sort object keys recursively
     * @param {any} obj - Object to sort
     * @returns {any}
     */
    sortKeysDeep(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => this.sortKeysDeep(item));
        }
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj)
                .sort()
                .reduce((sorted, key) => {
                    sorted[key] = this.sortKeysDeep(obj[key]);
                    return sorted;
                }, {});
        }
        return obj;
    },

    /**
     * Get JSON statistics
     * @param {any} data - Parsed JSON data
     * @returns {{ keys: number, values: number, strings: number, numbers: number, booleans: number, nulls: number, arrays: number, objects: number, depth: number }}
     */
    getStats(data) {
        const stats = {
            keys: 0,
            values: 0,
            strings: 0,
            numbers: 0,
            booleans: 0,
            nulls: 0,
            arrays: 0,
            objects: 0,
            depth: 0
        };

        const analyze = (node, depth = 0) => {
            stats.depth = Math.max(stats.depth, depth);

            if (node === null) {
                stats.nulls++;
                stats.values++;
            } else if (Array.isArray(node)) {
                stats.arrays++;
                node.forEach(item => analyze(item, depth + 1));
            } else if (typeof node === 'object') {
                stats.objects++;
                Object.keys(node).forEach(key => {
                    stats.keys++;
                    analyze(node[key], depth + 1);
                });
            } else {
                stats.values++;
                if (typeof node === 'string') stats.strings++;
                else if (typeof node === 'number') stats.numbers++;
                else if (typeof node === 'boolean') stats.booleans++;
            }
        };

        analyze(data);
        return stats;
    },

    /**
     * Search within JSON
     * @param {any} data - Parsed JSON data
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array<{ path: string, key: string, value: any, matchType: 'key' | 'value' }>}
     */
    search(data, query, options = {}) {
        const { caseSensitive = false, searchKeys = true, searchValues = true } = options;
        const results = [];
        const q = caseSensitive ? query : query.toLowerCase();

        const traverse = (node, path = '') => {
            if (node === null) return;

            if (Array.isArray(node)) {
                node.forEach((item, index) => {
                    traverse(item, `${path}[${index}]`);
                });
            } else if (typeof node === 'object') {
                Object.entries(node).forEach(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    const keyToMatch = caseSensitive ? key : key.toLowerCase();

                    if (searchKeys && keyToMatch.includes(q)) {
                        results.push({ path: currentPath, key, value, matchType: 'key' });
                    }

                    if (searchValues && typeof value === 'string') {
                        const valueToMatch = caseSensitive ? value : value.toLowerCase();
                        if (valueToMatch.includes(q)) {
                            results.push({ path: currentPath, key, value, matchType: 'value' });
                        }
                    }

                    traverse(value, currentPath);
                });
            }
        };

        traverse(data);
        return results;
    },

    /**
     * Get value at JSON path
     * @param {any} data - Parsed JSON data
     * @param {string} path - Dot-notation path (e.g., "user.name" or "items[0].id")
     * @returns {any}
     */
    getPath(data, path) {
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
        let current = data;

        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }

        return current;
    },

    /**
     * Flatten nested JSON to dot-notation paths
     * @param {any} data - Parsed JSON data
     * @param {string} [prefix=''] - Path prefix
     * @returns {Object}
     */
    flatten(data, prefix = '') {
        const result = {};

        const traverse = (node, path) => {
            if (node === null || typeof node !== 'object') {
                result[path] = node;
            } else if (Array.isArray(node)) {
                if (node.length === 0) {
                    result[path] = [];
                } else {
                    node.forEach((item, index) => {
                        traverse(item, `${path}[${index}]`);
                    });
                }
            } else {
                const keys = Object.keys(node);
                if (keys.length === 0) {
                    result[path] = {};
                } else {
                    keys.forEach(key => {
                        traverse(node[key], path ? `${path}.${key}` : key);
                    });
                }
            }
        };

        traverse(data, prefix);
        return result;
    },

    /**
     * Unflatten dot-notation paths back to nested JSON
     * @param {Object} data - Flattened object
     * @returns {Object}
     */
    unflatten(data) {
        const result = {};

        Object.entries(data).forEach(([path, value]) => {
            const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
            let current = result;

            parts.forEach((part, index) => {
                const isLast = index === parts.length - 1;
                const nextPart = parts[index + 1];
                const isNextArrayIndex = nextPart && /^\d+$/.test(nextPart);

                if (isLast) {
                    current[part] = value;
                } else {
                    if (!(part in current)) {
                        current[part] = isNextArrayIndex ? [] : {};
                    }
                    current = current[part];
                }
            });
        });

        return result;
    },

    /**
     * Compare two JSON objects and return differences
     * @param {any} obj1 - First object
     * @param {any} obj2 - Second object
     * @returns {Array<{ path: string, type: 'added' | 'removed' | 'changed', oldValue?: any, newValue?: any }>}
     */
    diff(obj1, obj2) {
        const differences = [];
        const flat1 = this.flatten(obj1);
        const flat2 = this.flatten(obj2);

        const allKeys = new Set([...Object.keys(flat1), ...Object.keys(flat2)]);

        allKeys.forEach(key => {
            const in1 = key in flat1;
            const in2 = key in flat2;

            if (in1 && !in2) {
                differences.push({ path: key, type: 'removed', oldValue: flat1[key] });
            } else if (!in1 && in2) {
                differences.push({ path: key, type: 'added', newValue: flat2[key] });
            } else if (JSON.stringify(flat1[key]) !== JSON.stringify(flat2[key])) {
                differences.push({ path: key, type: 'changed', oldValue: flat1[key], newValue: flat2[key] });
            }
        });

        return differences;
    },

    /**
     * Check if string is valid JSON
     * @param {string} str - String to check
     * @returns {boolean}
     */
    isJSON(str) {
        if (typeof str !== 'string') return false;
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Detect and extract JSON from mixed content
     * @param {string} str - String containing JSON
     * @returns {string[]}
     */
    extractJSON(str) {
        if (typeof str !== 'string') return [];
        const jsonRegex = /[\[{][\s\S]*?[\]}]/g;
        const matches = str.match(jsonRegex) || [];
        return matches.filter(m => this.isJSON(m));
    },

    /**
     * Get human-readable size of JSON string
     * @param {string} json - JSON string
     * @returns {string}
     */
    getSize(json) {
        const bytes = new Blob([json]).size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    },

    /**
     * Escape HTML entities in JSON for safe display
     * @param {string} str - String to escape
     * @returns {string}
     */
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
};

// Export for use in extension
if (typeof window !== 'undefined') {
    window.JSONUtils = JSONUtils;
}
