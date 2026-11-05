/**
 * JSON Formatter Pro - CSV Converter (Pro Feature)
 * Convert JSON arrays to CSV format
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

const CSVConverter = {
    /**
     * Convert JSON array to CSV string
     * @param {Array<Object>} data - Array of objects
     * @param {Object} [options] - Conversion options
     * @param {string} [options.delimiter=','] - Field delimiter
     * @param {boolean} [options.headers=true] - Include header row
     * @param {string} [options.lineEnding='\n'] - Line ending character
     * @returns {string}
     */
    toCSV(data, options = {}) {
        const { delimiter = ',', headers = true, lineEnding = '\n' } = options;

        if (!Array.isArray(data)) {
            throw new Error('Input must be an array');
        }

        if (data.length === 0) {
            return '';
        }

        // Handle array of primitives
        if (typeof data[0] !== 'object' || data[0] === null) {
            return data.map(item => this.escapeValue(String(item), delimiter)).join(lineEnding);
        }

        // Get all unique keys from all objects
        const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))];

        const lines = [];

        // Add header row
        if (headers) {
            lines.push(keys.map(k => this.escapeValue(k, delimiter)).join(delimiter));
        }

        // Add data rows
        data.forEach(row => {
            const values = keys.map(key => {
                const value = row[key];

                if (value === null || value === undefined) {
                    return '';
                }

                if (typeof value === 'object') {
                    return this.escapeValue(JSON.stringify(value), delimiter);
                }

                return this.escapeValue(String(value), delimiter);
            });

            lines.push(values.join(delimiter));
        });

        return lines.join(lineEnding);
    },

    /**
     * Escape CSV value if needed
     * @param {string} value - Value to escape
     * @param {string} delimiter - Field delimiter
     * @returns {string}
     */
    escapeValue(value, delimiter) {
        // Check if value needs quoting
        if (
            value.includes(delimiter) ||
            value.includes('"') ||
            value.includes('\n') ||
            value.includes('\r')
        ) {
            // Double any existing quotes and wrap in quotes
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    },

    /**
     * Parse CSV string to JSON array
     * @param {string} csv - CSV string
     * @param {Object} [options] - Parse options
     * @param {string} [options.delimiter=','] - Field delimiter
     * @param {boolean} [options.headers=true] - First row is headers
     * @returns {Array<Object|string[]>}
     */
    fromCSV(csv, options = {}) {
        const { delimiter = ',', headers = true } = options;

        const lines = this.parseCSVLines(csv, delimiter);

        if (lines.length === 0) {
            return [];
        }

        if (!headers) {
            return lines;
        }

        const headerRow = lines[0];
        const dataLines = lines.slice(1);

        return dataLines.map(values => {
            const obj = {};
            headerRow.forEach((key, index) => {
                obj[key] = values[index] !== undefined ? values[index] : '';
            });
            return obj;
        });
    },

    /**
     * Parse CSV string into array of arrays, handling quoted fields
     * @param {string} csv - CSV string
     * @param {string} delimiter - Field delimiter
     * @returns {string[][]}
     */
    parseCSVLines(csv, delimiter) {
        const lines = [];
        let currentLine = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const char = csv[i];
            const nextChar = csv[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        // Escaped quote
                        currentValue += '"';
                        i++;
                    } else {
                        // End of quoted field
                        inQuotes = false;
                    }
                } else {
                    currentValue += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === delimiter) {
                    currentLine.push(currentValue);
                    currentValue = '';
                } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                    currentLine.push(currentValue);
                    if (currentLine.some(v => v !== '')) {
                        lines.push(currentLine);
                    }
                    currentLine = [];
                    currentValue = '';
                    if (char === '\r') i++;
                } else if (char !== '\r') {
                    currentValue += char;
                }
            }
        }

        // Don't forget the last value
        currentLine.push(currentValue);
        if (currentLine.some(v => v !== '')) {
            lines.push(currentLine);
        }

        return lines;
    },

    /**
     * Detect delimiter from CSV content
     * @param {string} csv - CSV string
     * @returns {string}
     */
    detectDelimiter(csv) {
        const delimiters = [',', ';', '\t', '|'];
        const firstLine = csv.split('\n')[0];

        let maxCount = 0;
        let detected = ',';

        delimiters.forEach(d => {
            const count = (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                detected = d;
            }
        });

        return detected;
    }
};

// Export for use in extension
if (typeof window !== 'undefined') {
    window.CSVConverter = CSVConverter;
}
