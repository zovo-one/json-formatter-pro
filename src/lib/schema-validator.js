/**
 * JSON Formatter Pro - Schema Validator (Pro Feature)
 * Validate JSON against JSON Schema (draft-07 compatible)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

const SchemaValidator = {
    /**
     * Validate data against JSON Schema
     * @param {any} data - Data to validate
     * @param {Object} schema - JSON Schema
     * @returns {{ valid: boolean, errors: Array<{ path: string, message: string, keyword: string }> }}
     */
    validate(data, schema) {
        const errors = [];

        this.validateNode(data, schema, '', errors);

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Validate a single node against schema
     * @private
     */
    validateNode(node, schema, path, errors) {
        if (!schema || typeof schema !== 'object') return;

        // Handle $ref (basic support)
        if (schema.$ref) {
            // Note: Full $ref resolution would require schema registry
            return;
        }

        // Type validation
        if (schema.type) {
            const types = Array.isArray(schema.type) ? schema.type : [schema.type];
            const actualType = this.getType(node);

            if (!types.includes(actualType) && !(actualType === 'integer' && types.includes('number'))) {
                errors.push({
                    path: path || '$',
                    message: `Expected type ${types.join(' or ')}, got ${actualType}`,
                    keyword: 'type'
                });
                return; // Skip further validation if type is wrong
            }
        }

        // Const validation
        if (schema.const !== undefined) {
            if (!this.deepEqual(node, schema.const)) {
                errors.push({
                    path: path || '$',
                    message: `Value must equal ${JSON.stringify(schema.const)}`,
                    keyword: 'const'
                });
            }
        }

        // Enum validation
        if (schema.enum) {
            if (!schema.enum.some(v => this.deepEqual(node, v))) {
                errors.push({
                    path: path || '$',
                    message: `Value must be one of: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`,
                    keyword: 'enum'
                });
            }
        }

        // String validations
        if (typeof node === 'string') {
            if (schema.minLength !== undefined && node.length < schema.minLength) {
                errors.push({
                    path,
                    message: `String must be at least ${schema.minLength} characters`,
                    keyword: 'minLength'
                });
            }

            if (schema.maxLength !== undefined && node.length > schema.maxLength) {
                errors.push({
                    path,
                    message: `String must be at most ${schema.maxLength} characters`,
                    keyword: 'maxLength'
                });
            }

            if (schema.pattern) {
                try {
                    if (!new RegExp(schema.pattern).test(node)) {
                        errors.push({
                            path,
                            message: `String must match pattern: ${schema.pattern}`,
                            keyword: 'pattern'
                        });
                    }
                } catch (e) {
                    // Invalid regex in schema
                }
            }

            // Format validation (basic)
            if (schema.format) {
                const formatValid = this.validateFormat(node, schema.format);
                if (!formatValid) {
                    errors.push({
                        path,
                        message: `String must be a valid ${schema.format}`,
                        keyword: 'format'
                    });
                }
            }
        }

        // Number validations
        if (typeof node === 'number') {
            if (schema.minimum !== undefined && node < schema.minimum) {
                errors.push({
                    path,
                    message: `Number must be >= ${schema.minimum}`,
                    keyword: 'minimum'
                });
            }

            if (schema.maximum !== undefined && node > schema.maximum) {
                errors.push({
                    path,
                    message: `Number must be <= ${schema.maximum}`,
                    keyword: 'maximum'
                });
            }

            if (schema.exclusiveMinimum !== undefined && node <= schema.exclusiveMinimum) {
                errors.push({
                    path,
                    message: `Number must be > ${schema.exclusiveMinimum}`,
                    keyword: 'exclusiveMinimum'
                });
            }

            if (schema.exclusiveMaximum !== undefined && node >= schema.exclusiveMaximum) {
                errors.push({
                    path,
                    message: `Number must be < ${schema.exclusiveMaximum}`,
                    keyword: 'exclusiveMaximum'
                });
            }

            if (schema.multipleOf !== undefined && node % schema.multipleOf !== 0) {
                errors.push({
                    path,
                    message: `Number must be a multiple of ${schema.multipleOf}`,
                    keyword: 'multipleOf'
                });
            }
        }

        // Array validations
        if (Array.isArray(node)) {
            if (schema.minItems !== undefined && node.length < schema.minItems) {
                errors.push({
                    path,
                    message: `Array must have at least ${schema.minItems} items`,
                    keyword: 'minItems'
                });
            }

            if (schema.maxItems !== undefined && node.length > schema.maxItems) {
                errors.push({
                    path,
                    message: `Array must have at most ${schema.maxItems} items`,
                    keyword: 'maxItems'
                });
            }

            if (schema.uniqueItems) {
                const seen = new Set();
                const hasDuplicates = node.some(item => {
                    const key = JSON.stringify(item);
                    if (seen.has(key)) return true;
                    seen.add(key);
                    return false;
                });

                if (hasDuplicates) {
                    errors.push({
                        path,
                        message: 'Array items must be unique',
                        keyword: 'uniqueItems'
                    });
                }
            }

            // Validate each item
            if (schema.items) {
                node.forEach((item, index) => {
                    this.validateNode(item, schema.items, `${path}[${index}]`, errors);
                });
            }
        }

        // Object validations
        if (typeof node === 'object' && node !== null && !Array.isArray(node)) {
            const nodeKeys = Object.keys(node);

            // Required properties
            if (schema.required) {
                schema.required.forEach(key => {
                    if (!(key in node)) {
                        errors.push({
                            path: path ? `${path}.${key}` : key,
                            message: 'Required property is missing',
                            keyword: 'required'
                        });
                    }
                });
            }

            // Min/max properties
            if (schema.minProperties !== undefined && nodeKeys.length < schema.minProperties) {
                errors.push({
                    path,
                    message: `Object must have at least ${schema.minProperties} properties`,
                    keyword: 'minProperties'
                });
            }

            if (schema.maxProperties !== undefined && nodeKeys.length > schema.maxProperties) {
                errors.push({
                    path,
                    message: `Object must have at most ${schema.maxProperties} properties`,
                    keyword: 'maxProperties'
                });
            }

            // Property validations
            if (schema.properties) {
                Object.entries(node).forEach(([key, value]) => {
                    if (schema.properties[key]) {
                        this.validateNode(
                            value,
                            schema.properties[key],
                            path ? `${path}.${key}` : key,
                            errors
                        );
                    }
                });
            }

            // Additional properties
            if (schema.additionalProperties === false) {
                const allowedKeys = new Set(Object.keys(schema.properties || {}));
                const patternKeys = schema.patternProperties ? Object.keys(schema.patternProperties) : [];

                nodeKeys.forEach(key => {
                    if (!allowedKeys.has(key)) {
                        const matchesPattern = patternKeys.some(pattern => new RegExp(pattern).test(key));
                        if (!matchesPattern) {
                            errors.push({
                                path: path ? `${path}.${key}` : key,
                                message: 'Additional property is not allowed',
                                keyword: 'additionalProperties'
                            });
                        }
                    }
                });
            }
        }
    },

    /**
     * Get JSON Schema type for a value
     * @param {any} value - Value to check
     * @returns {string}
     */
    getType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'integer' : 'number';
        }
        return typeof value;
    },

    /**
     * Deep equality check
     * @param {any} a - First value
     * @param {any} b - Second value
     * @returns {boolean}
     */
    deepEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== typeof b) return false;
        if (typeof a !== 'object' || a === null || b === null) return false;

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        return keysA.every(key => this.deepEqual(a[key], b[key]));
    },

    /**
     * Validate string format
     * @param {string} value - String to validate
     * @param {string} format - Format name
     * @returns {boolean}
     */
    validateFormat(value, format) {
        const formats = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            uri: /^https?:\/\/.+/,
            'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
            date: /^\d{4}-\d{2}-\d{2}$/,
            time: /^\d{2}:\d{2}:\d{2}/,
            ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
            ipv6: /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/,
            uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        };

        const pattern = formats[format];
        return pattern ? pattern.test(value) : true;
    }
};

// Export for use in extension
if (typeof window !== 'undefined') {
    window.SchemaValidator = SchemaValidator;
}
