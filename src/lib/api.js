/**
 * JSON Formatter Pro - API Client
 * Handles all communication with Zovo Supabase Edge Functions
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

// Supabase Edge Functions base URL (live Zovo project)
const SUPABASE_URL = 'https://zgubxqomnbmxgbdhvwja.supabase.co/functions/v1';

// Product key the server uses to resolve this extension's Pro feature set.
const EXTENSION_KEY = 'json_formatter_pro';

// Last server verdict for the stored key (chrome.storage.local). isPro() reuses it for a day and keeps it
// when the server cannot be reached (network error, 5xx, 429). Only an explicit invalid answer revokes.
const PRO_VERDICT_KEY = 'zovoProVerdict';
const PRO_RECHECK_MS = 24 * 60 * 60 * 1000;

async function readProVerdict(key) {
    try {
        const r = await chrome.storage.local.get(PRO_VERDICT_KEY);
        const v = r && r[PRO_VERDICT_KEY];
        return v && v.key === key ? v : null;
    } catch (e) {
        return null;
    }
}

async function writeProVerdict(key, pro) {
    try {
        await chrome.storage.local.set({ [PRO_VERDICT_KEY]: { key, pro: pro === true, at: Date.now() } });
    } catch (e) { /* best effort */ }
}

// ==================
// LICENSE KEY MANAGEMENT
// ==================

/**
 * Get stored license key from chrome.storage.sync
 * @returns {Promise<string|null>}
 */
async function getLicenseKey() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        return null;
    }
    try {
        const result = await chrome.storage.sync.get('licenseKey');
        return result.licenseKey || null;
    } catch (error) {
        console.error('[API] Get license key error:', error);
        return null;
    }
}

/**
 * Store license key to chrome.storage.sync
 * @param {string} key - License key (ZOVO-XXXX-XXXX-XXXX-XXXX)
 * @returns {Promise<void>}
 */
async function setLicenseKey(key) {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        return;
    }
    try {
        await chrome.storage.sync.set({ licenseKey: key });
    } catch (error) {
        console.error('[API] Set license key error:', error);
    }
}

/**
 * Remove license key from storage
 * @returns {Promise<void>}
 */
async function clearLicenseKey() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        return;
    }
    try {
        await chrome.storage.sync.remove('licenseKey');
    } catch (error) {
        console.error('[API] Clear license key error:', error);
    }
}

// ==================
// LICENSE VERIFICATION
// ==================

/**
 * Verify license key with server
 * @returns {Promise<{valid: boolean, is_pro?: boolean, membership_tier?: string, features?: object, reason?: string}>}
 */
async function verifyLicense() {
    const key = await getLicenseKey();

    if (!key) {
        return { valid: false, reason: 'NO_KEY' };
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/verify-extension-license`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ license_key: key, extension: EXTENSION_KEY })
        });

        // The live endpoint always returns a JSON body carrying a `valid` flag.
        let data = null;
        try {
            data = await response.json();
        } catch (_parseErr) {
            data = null;
        }

        if (data && data.valid === true) {
            // Server membership_tier is one of: free | pro | lifetime.
            // Both 'pro' and 'lifetime' unlock Pro (a $99 lifetime buyer is not free).
            const tier = data.tier || 'pro';
            const is_pro = tier === 'pro' || tier === 'lifetime';
            await writeProVerdict(key, is_pro);
            return {
                valid: true,
                is_pro,
                membership_tier: tier,
                features: Array.isArray(data.features) ? data.features : []
            };
        }

        // Not valid. Classify the failure for the UI.
        if (response.status === 429) {
            return { valid: false, reason: 'RATE_LIMITED' };
        }
        if (response.status >= 500) {
            return { valid: false, reason: 'SERVER_ERROR' };
        }
        // 400 (bad format), 403 (inactive), 404 (not found) => invalid/expired key.
        await writeProVerdict(key, false);
        return { valid: false, reason: 'INVALID_KEY' };
    } catch (error) {
        console.error('[API] Verify license error:', error);
        return { valid: false, reason: 'NETWORK_ERROR' };
    }
}

// ==================
// PRO API CALLS
// ==================

/**
 * Call a Pro API endpoint
 * @param {string} endpoint - Endpoint name (pro-yaml, pro-csv, pro-diff, pro-schema)
 * @param {object} body - Request body
 * @returns {Promise<{status: number, data: object}>}
 */
async function callProAPI(endpoint, body) {
    const key = await getLicenseKey();

    try {
        const response = await fetch(`${SUPABASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-license-key': key || ''
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        return {
            status: response.status,
            data
        };
    } catch (error) {
        console.error(`[API] ${endpoint} error:`, error);
        return {
            status: 0,
            data: { error: 'Network error', code: 'NETWORK_ERROR' }
        };
    }
}

// ==================
// PRO FEATURE HELPERS
// ==================

/**
 * Convert JSON to YAML via API
 * @param {any} jsonData - JSON data to convert
 * @returns {Promise<{status: number, data: object}>}
 */
async function convertToYAML(jsonData) {
    return callProAPI('pro-yaml', {
        action: 'to-yaml',
        data: jsonData
    });
}

/**
 * Export JSON to CSV via API
 * @param {Array} jsonData - Array of objects to export
 * @returns {Promise<{status: number, data: object}>}
 */
async function exportToCSV(jsonData) {
    return callProAPI('pro-csv', {
        action: 'to-csv',
        data: jsonData
    });
}

/**
 * Compare two JSON objects via API
 * @param {any} left - First JSON object
 * @param {any} right - Second JSON object
 * @returns {Promise<{status: number, data: object}>}
 */
async function compareJSON(left, right) {
    return callProAPI('pro-diff', {
        left,
        right
    });
}

/**
 * Validate JSON against schema via API
 * @param {any} jsonData - JSON data to validate
 * @param {object} schema - JSON Schema
 * @returns {Promise<{status: number, data: object}>}
 */
async function validateSchema(jsonData, schema) {
    return callProAPI('pro-schema', {
        data: jsonData,
        schema
    });
}

// ==================
// UTILITY
// ==================

/**
 * Check if user has a valid Pro subscription
 * @returns {Promise<boolean>}
 */
async function isPro() {
    const key = await getLicenseKey();
    if (!key) return false;
    const last = await readProVerdict(key);
    const age = last ? Date.now() - Number(last.at || 0) : -1;
    if (last && age >= 0 && age < PRO_RECHECK_MS) return last.pro === true;
    const result = await verifyLicense();
    if (result.valid) return result.is_pro === true;
    if (result.reason === 'INVALID_KEY') return false;
    // Network error, 5xx or 429. Keep the last verdict (a stored key with no verdict yet counts as Pro,
    // as Storage.checkPro and the activation path already do).
    return last ? last.pro === true : true;
}

/**
 * Format license key for display (masked)
 * @param {string} key - Full license key
 * @returns {string} - Masked key like ZOVO-XXXX-XXXX-XXXX-1234
 */
function maskLicenseKey(key) {
    if (!key || key.length < 10) return '****';
    return key.substring(0, 5) + 'XXXX-XXXX-XXXX-' + key.substring(key.length - 4);
}

// Export for browser context
if (typeof window !== 'undefined') {
    window.ZovoAPI = {
        getLicenseKey,
        setLicenseKey,
        clearLicenseKey,
        verifyLicense,
        callProAPI,
        convertToYAML,
        exportToCSV,
        compareJSON,
        validateSchema,
        isPro,
        maskLicenseKey
    };
}
