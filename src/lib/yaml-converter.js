/**
 * JSON Formatter Pro - YAML Converter (Pro Feature)
 * Convert between JSON and YAML formats
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

const YAMLConverter = {
    /**
     * Convert JSON data to YAML string
     * @param {any} data - Parsed JSON data
     * @param {number} [indent=2] - Indentation spaces
     * @returns {string}
     */
    toYAML(data, indent = 2) {
        const lines = [];

        const serialize = (node, level = 0) => {
            const spaces = ' '.repeat(level * indent);

            if (node === null) {
                return 'null';
            }

            if (node === undefined) {
                return '~';
            }

            if (Array.isArray(node)) {
                if (node.length === 0) {
                    return '[]';
                }
                node.forEach(item => {
                    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                        lines.push(`${spaces}-`);
                        Object.entries(item).forEach(([key, value], idx) => {
                            const itemSpaces = ' '.repeat((level + 1) * indent);
                            if (typeof value === 'object' && value !== null) {
                                lines.push(`${itemSpaces}${this.escapeKey(key)}:`);
                                serialize(value, level + 2);
                            } else {
                                lines.push(`${itemSpaces}${this.escapeKey(key)}: ${serialize(value)}`);
                            }
                        });
                    } else if (Array.isArray(item)) {
                        lines.push(`${spaces}-`);
                        serialize(item, level + 1);
                    } else {
                        lines.push(`${spaces}- ${serialize(item)}`);
                    }
                });
                return null;
            }

            if (typeof node === 'object') {
                if (Object.keys(node).length === 0) {
                    return '{}';
                }
                Object.entries(node).forEach(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                        lines.push(`${spaces}${this.escapeKey(key)}:`);
                        serialize(value, level + 1);
                    } else {
                        lines.push(`${spaces}${this.escapeKey(key)}: ${serialize(value)}`);
                    }
                });
                return null;
            }

            if (typeof node === 'string') {
                // Check if string needs quoting
                if (
                    node === '' ||
                    node.includes('\n') ||
                    node.includes(':') ||
                    node.includes('#') ||
                    node.includes("'") ||
                    node.includes('"') ||
                    node.startsWith(' ') ||
                    node.endsWith(' ') ||
                    /^[\[\]{}&*!|>'"%@`]/.test(node) ||
                    /^(true|false|null|yes|no|on|off)$/i.test(node) ||
                    /^-?\d/.test(node)
                ) {
                    return `"${node.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
                }
                return node;
            }

            if (typeof node === 'boolean') {
                return node ? 'true' : 'false';
            }

            if (typeof node === 'number') {
                if (Number.isNaN(node)) return '.nan';
                if (!Number.isFinite(node)) return node > 0 ? '.inf' : '-.inf';
                return String(node);
            }

            return String(node);
        };

        const result = serialize(data);
        if (result !== null) {
            return result;
        }
        return lines.join('\n');
    },

    /**
     * Escape YAML key if needed
     * @param {string} key - Object key
     * @returns {string}
     */
    escapeKey(key) {
        if (/[:\[\]{}#&*!|>'"%@`,?-]/.test(key) || /^\s|\s$/.test(key)) {
            return `"${key.replace(/"/g, '\\"')}"`;
        }
        return key;
    },

    /**
     * Parse YAML string to JSON (basic implementation)
     * Note: This handles common YAML patterns but not all edge cases.
     * For full YAML support, consider using js-yaml library.
     * 
     * @param {string} yaml - YAML string
     * @returns {any}
     */
    fromYAML(yaml) {
        const lines = yaml.split('\n');
        const root = {};
        const stack = [{ obj: root, indent: -1, isArray: false }];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty lines and comments
            if (!line.trim() || line.trim().startsWith('#')) {
                continue;
            }

            const indent = line.search(/\S/);
            const content = line.trim();

            // Pop stack to correct level
            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }

            const parent = stack[stack.length - 1];

            // Handle array item
            if (content.startsWith('- ')) {
                const value = content.substring(2).trim();

                // Ensure parent is an array
                if (!Array.isArray(parent.obj)) {
                    // Convert to array if this is the first array item
                    const lastKey = parent.lastKey;
                    if (lastKey && parent.parentObj) {
                        parent.parentObj[lastKey] = [];
                        parent.obj = parent.parentObj[lastKey];
                    }
                }

                if (value.includes(':')) {
                    // Inline object in array
                    const obj = {};
                    const [key, ...valueParts] = value.split(':');
                    const val = valueParts.join(':').trim();
                    obj[key.trim()] = this.parseValue(val);
                    parent.obj.push(obj);
                } else if (value) {
                    parent.obj.push(this.parseValue(value));
                } else {
                    // Empty array item, next lines will populate it
                    const obj = {};
                    parent.obj.push(obj);
                    stack.push({ obj, indent, isArray: false, parentObj: parent.obj, lastKey: parent.obj.length - 1 });
                }
                continue;
            }

            // Handle key-value pair
            if (content.includes(':')) {
                const colonIndex = content.indexOf(':');
                const key = content.substring(0, colonIndex).trim().replace(/^["']|["']$/g, '');
                const value = content.substring(colonIndex + 1).trim();

                if (value) {
                    parent.obj[key] = this.parseValue(value);
                } else {
                    // Nested object or array
                    parent.obj[key] = {};
                    stack.push({
                        obj: parent.obj[key],
                        indent,
                        isArray: false,
                        parentObj: parent.obj,
                        lastKey: key
                    });
                }
            }
        }

        return root;
    },

    /**
     * Parse YAML value to appropriate JavaScript type
     * @param {string} str - YAML value string
     * @returns {any}
     */
    parseValue(str) {
        if (str === '' || str === '~' || str === 'null') return null;
        if (str === 'true' || str === 'yes' || str === 'on') return true;
        if (str === 'false' || str === 'no' || str === 'off') return false;
        if (str === '.inf' || str === '+.inf') return Infinity;
        if (str === '-.inf') return -Infinity;
        if (str === '.nan') return NaN;

        // Handle quoted strings
        if ((str.startsWith('"') && str.endsWith('"')) ||
            (str.startsWith("'") && str.endsWith("'"))) {
            return str.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        // Handle numbers
        if (/^-?\d+$/.test(str)) return parseInt(str, 10);
        if (/^-?\d*\.\d+$/.test(str)) return parseFloat(str);
        if (/^-?\d+\.?\d*e[+-]?\d+$/i.test(str)) return parseFloat(str);

        // Handle inline arrays
        if (str.startsWith('[') && str.endsWith(']')) {
            try {
                return JSON.parse(str);
            } catch {
                return str;
            }
        }

        // Handle inline objects
        if (str.startsWith('{') && str.endsWith('}')) {
            try {
                return JSON.parse(str);
            } catch {
                return str;
            }
        }

        return str;
    }
};

// Export for use in extension
if (typeof window !== 'undefined') {
    window.YAMLConverter = YAMLConverter;
}
