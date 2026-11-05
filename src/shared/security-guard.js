/**
 * JSON Formatter Pro - Deep Debug Agent 53
 * Security Hardening: Prototype Pollution & JSON Bomb Prevention
 * 
 * Top 1% Edge Cases:
 * - Prototype pollution via __proto__, constructor
 * - JSON bomb (deeply nested/recursive structures)
 * - Unicode normalization attacks
 * - JSONP detection and blocking
 * - Content-type validation
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class SecurityGuard {
    constructor() {
        this.DANGEROUS_KEYS = new Set([
            '__proto__',
            'constructor',
            'prototype',
            '__defineGetter__',
            '__defineSetter__',
            '__lookupGetter__',
            '__lookupSetter__'
        ]);

        // Limits to prevent JSON bombs
        this.MAX_DEPTH = 100;
        this.MAX_KEYS = 50000;
        this.MAX_STRING_LENGTH = 10 * 1024 * 1024; // 10MB
        this.MAX_ARRAY_LENGTH = 100000;
    }

    // =====================
    // PROTOTYPE POLLUTION PREVENTION
    // =====================

    /**
     * Check if key is dangerous (prototype pollution vector)
     */
    isDangerousKey(key) {
        return this.DANGEROUS_KEYS.has(key);
    }

    /**
     * Sanitize object keys recursively
     * CRITICAL: Prevents prototype pollution attacks
     */
    sanitizeKeys(obj, depth = 0) {
        if (depth > this.MAX_DEPTH) {
            throw new Error('Maximum depth exceeded - possible JSON bomb');
        }

        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            if (obj.length > this.MAX_ARRAY_LENGTH) {
                throw new Error('Maximum array length exceeded');
            }
            return obj.map(item => this.sanitizeKeys(item, depth + 1));
        }

        const keys = Object.keys(obj);
        if (keys.length > this.MAX_KEYS) {
            throw new Error('Maximum key count exceeded');
        }

        const sanitized = Object.create(null); // No prototype

        for (const key of keys) {
            if (this.isDangerousKey(key)) {
                console.warn(`[SecurityGuard] Blocked dangerous key: ${key}`);
                continue; // Skip dangerous keys
            }

            sanitized[key] = this.sanitizeKeys(obj[key], depth + 1);
        }

        return sanitized;
    }

    /**
     * Safe JSON parse with prototype pollution protection
     */
    safeParse(jsonString) {
        if (typeof jsonString !== 'string') {
            throw new Error('Input must be a string');
        }

        if (jsonString.length > this.MAX_STRING_LENGTH) {
            throw new Error('JSON string exceeds maximum length');
        }

        // Check for dangerous patterns before parsing
        if (this.containsDangerousPatterns(jsonString)) {
            // Parse then sanitize
            const parsed = JSON.parse(jsonString);
            return this.sanitizeKeys(parsed);
        }

        return JSON.parse(jsonString);
    }

    /**
     * Check for dangerous patterns in JSON string
     */
    containsDangerousPatterns(str) {
        const dangerousPatterns = [
            /__proto__/i,
            /constructor/i,
            /prototype/i
        ];

        return dangerousPatterns.some(pattern => pattern.test(str));
    }

    // =====================
    // JSON BOMB PREVENTION
    // =====================

    /**
     * Analyze JSON structure for potential bombs
     * CRITICAL: Prevents DoS via deeply nested structures
     */
    analyzeStructure(obj, depth = 0, stats = null) {
        if (!stats) {
            stats = {
                depth: 0,
                totalKeys: 0,
                totalElements: 0,
                maxStringLength: 0,
                isSafe: true,
                reason: null
            };
        }

        stats.depth = Math.max(stats.depth, depth);

        if (depth > this.MAX_DEPTH) {
            stats.isSafe = false;
            stats.reason = `Depth ${depth} exceeds limit ${this.MAX_DEPTH}`;
            return stats;
        }

        if (obj === null || typeof obj !== 'object') {
            if (typeof obj === 'string') {
                stats.maxStringLength = Math.max(stats.maxStringLength, obj.length);
            }
            return stats;
        }

        if (Array.isArray(obj)) {
            stats.totalElements += obj.length;

            if (obj.length > this.MAX_ARRAY_LENGTH) {
                stats.isSafe = false;
                stats.reason = `Array length ${obj.length} exceeds limit`;
                return stats;
            }

            for (const item of obj) {
                this.analyzeStructure(item, depth + 1, stats);
                if (!stats.isSafe) return stats;
            }
        } else {
            const keys = Object.keys(obj);
            stats.totalKeys += keys.length;

            if (stats.totalKeys > this.MAX_KEYS) {
                stats.isSafe = false;
                stats.reason = `Total keys ${stats.totalKeys} exceeds limit`;
                return stats;
            }

            for (const key of keys) {
                this.analyzeStructure(obj[key], depth + 1, stats);
                if (!stats.isSafe) return stats;
            }
        }

        return stats;
    }

    /**
     * Validate JSON is safe to process
     */
    validateSafety(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            const analysis = this.analyzeStructure(parsed);

            return {
                valid: analysis.isSafe,
                analysis,
                error: analysis.reason
            };
        } catch (e) {
            return {
                valid: false,
                analysis: null,
                error: e.message
            };
        }
    }

    // =====================
    // UNICODE NORMALIZATION
    // =====================

    /**
     * Normalize unicode to prevent homograph attacks
     */
    normalizeUnicode(str) {
        return str.normalize('NFC');
    }

    /**
     * Detect suspicious unicode characters
     */
    detectSuspiciousUnicode(str) {
        const suspicious = [];

        // Zero-width characters
        if (/[\u200B-\u200D\uFEFF]/.test(str)) {
            suspicious.push('zero-width-characters');
        }

        // RTL override characters
        if (/[\u202A-\u202E\u2066-\u2069]/.test(str)) {
            suspicious.push('rtl-override');
        }

        // Homograph characters (look-alikes)
        if (/[а-яА-Я]/.test(str)) {
            suspicious.push('cyrillic-lookalikes');
        }

        return suspicious;
    }

    // =====================
    // JSONP DETECTION
    // =====================

    /**
     * Detect and extract JSON from JSONP wrapper
     */
    detectJSONP(str) {
        const trimmed = str.trim();

        // Common JSONP patterns
        const patterns = [
            /^(\w+)\s*\(([\s\S]*)\)\s*;?\s*$/,           // callback(data)
            /^\/\*\*\/\s*(\w+)\s*\(([\s\S]*)\)\s*;?\s*$/, // /**/callback(data)
        ];

        for (const pattern of patterns) {
            const match = trimmed.match(pattern);
            if (match) {
                return {
                    isJSONP: true,
                    callback: match[1],
                    json: match[2]
                };
            }
        }

        return { isJSONP: false };
    }

    /**
     * Clean JSONP to pure JSON
     */
    cleanJSONP(str) {
        const result = this.detectJSONP(str);
        return result.isJSONP ? result.json : str;
    }

    // =====================
    // CONTENT TYPE VALIDATION
    // =====================

    /**
     * Validate content type for JSON
     */
    isValidJSONContentType(contentType) {
        const validTypes = [
            'application/json',
            'text/json',
            'text/plain'
        ];

        const normalized = contentType?.toLowerCase().split(';')[0].trim();
        return validTypes.includes(normalized);
    }

    // =====================
    // COMPREHENSIVE SAFE PARSE
    // =====================

    /**
     * Ultimate safe parse with all protections
     */
    ultraSafeParse(input, options = {}) {
        const { allowJSONP = true, normalize = true } = options;

        let jsonString = input;

        // Normalize unicode if enabled
        if (normalize) {
            jsonString = this.normalizeUnicode(jsonString);
        }

        // Clean JSONP if present
        if (allowJSONP) {
            jsonString = this.cleanJSONP(jsonString);
        }

        // Validate structure safety
        const safety = this.validateSafety(jsonString);
        if (!safety.valid) {
            throw new Error(`Unsafe JSON: ${safety.error}`);
        }

        // Parse with prototype pollution protection
        return this.safeParse(jsonString);
    }
}

// Export singleton
const securityGuard = new SecurityGuard();
export { securityGuard, SecurityGuard };
