/**
 * JSON Formatter Pro - Input Validator
 * User input validation and sanitization (md-18 Agent 27)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class InputValidator {
    // =====================
    // PATTERNS
    // =====================

    static patterns = {
        email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        url: /^https?:\/\/[^\s<>'"]+$/,
        alphanumeric: /^[a-zA-Z0-9]+$/,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        hexColor: /^#[0-9a-fA-F]{6}$/,
        slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        integer: /^-?\d+$/,
        decimal: /^-?\d+\.?\d*$/
    };

    // =====================
    // VALIDATION
    // =====================

    /**
     * Validate a value against multiple rules
     */
    static validate(value, rules) {
        const errors = [];

        for (const rule of rules) {
            const error = this.applyRule(value, rule);
            if (error) {
                errors.push(error);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            value: errors.length === 0 ? value : null
        };
    }

    /**
     * Apply a single validation rule
     */
    static applyRule(value, rule) {
        const strValue = String(value ?? '');

        switch (rule.type) {
            case 'required':
                if (!value || strValue.trim() === '') {
                    return rule.message || 'This field is required';
                }
                break;

            case 'minLength':
                if (strValue.length < rule.value) {
                    return rule.message || `Minimum length is ${rule.value}`;
                }
                break;

            case 'maxLength':
                if (strValue.length > rule.value) {
                    return rule.message || `Maximum length is ${rule.value}`;
                }
                break;

            case 'pattern':
                const pattern = this.patterns[rule.value] || rule.value;
                if (!pattern.test(strValue)) {
                    return rule.message || 'Invalid format';
                }
                break;

            case 'custom':
                if (!rule.validator(value)) {
                    return rule.message || 'Validation failed';
                }
                break;

            case 'noHTML':
                if (/<[^>]*>/.test(strValue)) {
                    return rule.message || 'HTML is not allowed';
                }
                break;

            case 'noScriptKeywords':
                const scriptKeywords = /javascript:|on\w+\s*=|<script|eval\(|Function\(/i;
                if (scriptKeywords.test(strValue)) {
                    return rule.message || 'Invalid characters detected';
                }
                break;

            case 'json':
                try {
                    JSON.parse(strValue);
                } catch (e) {
                    return rule.message || `Invalid JSON: ${e.message}`;
                }
                break;

            case 'maxSize':
                const size = new Blob([strValue]).size;
                if (size > rule.value) {
                    return rule.message || `Maximum size is ${this.formatSize(rule.value)}`;
                }
                break;
        }

        return null;
    }

    // =====================
    // SANITIZATION
    // =====================

    /**
     * Sanitize filename to prevent path traversal
     */
    static sanitizeFilename(filename) {
        if (!filename) return 'unnamed';
        return filename
            .replace(/\.\./g, '')
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
            .replace(/^\.+/, '')
            .substring(0, 255)
            .trim() || 'unnamed';
    }

    /**
     * Sanitize search query
     */
    static sanitizeSearchQuery(query) {
        if (!query) return '';
        return query
            .substring(0, 500)
            .replace(/<[^>]*>/g, '')
            .trim();
    }

    /**
     * Sanitize JSON input
     */
    static sanitizeJSONInput(input) {
        if (!input) return '';

        // Remove null bytes and control characters
        let sanitized = input.replace(/\x00/g, '');

        // Limit size to 5MB
        const maxSize = 5 * 1024 * 1024;
        if (new Blob([sanitized]).size > maxSize) {
            sanitized = sanitized.substring(0, maxSize);
        }

        return sanitized;
    }

    /**
     * Strip all potential XSS vectors
     */
    static stripXSS(input) {
        if (!input) return '';

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/data:text\/html/gi, '');
    }

    // =====================
    // UTILITIES
    // =====================

    /**
     * Check if string is valid JSON
     */
    static isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if URL is safe
     */
    static isURLSafe(url) {
        if (!url) return false;
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Format bytes to human readable size
     */
    static formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Validate and parse JSON with error details
     */
    static parseJSON(input) {
        const sanitized = this.sanitizeJSONInput(input);

        try {
            const parsed = JSON.parse(sanitized);
            return {
                success: true,
                data: parsed,
                error: null
            };
        } catch (e) {
            // Extract line/column from error message
            const match = e.message.match(/position (\d+)/);
            const position = match ? parseInt(match[1]) : null;

            // Find line number
            let line = 1;
            let column = 1;
            if (position !== null) {
                const upToError = sanitized.substring(0, position);
                line = (upToError.match(/\n/g) || []).length + 1;
                column = position - upToError.lastIndexOf('\n');
            }

            return {
                success: false,
                data: null,
                error: {
                    message: e.message,
                    position,
                    line,
                    column
                }
            };
        }
    }
}

// Freeze to prevent tampering
Object.freeze(InputValidator);
Object.freeze(InputValidator.patterns);

export { InputValidator };
