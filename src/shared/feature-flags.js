/**
 * JSON Formatter Pro - Feature Flags
 * Feature flag system with rollout (md-22 Agent 47)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class FeatureFlags {
    constructor() {
        this.flags = new Map();
        this.overrides = new Map();
        this.userId = null;
        this.userBucket = 0;
        this.initialized = false;
    }

    // =====================
    // INITIALIZATION
    // =====================

    async initialize() {
        await this.loadDefaultFlags();
        await this.loadLocalOverrides();
        await this.determineUserBucket();
        this.initialized = true;
        return this;
    }

    async loadDefaultFlags() {
        // Default flag definitions - shipped with extension
        const defaults = {
            'new-formatting-engine': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'New JSON formatting engine'
            },
            'yaml-export': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'Export to YAML format'
            },
            'json-diff': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'Side-by-side JSON diff'
            },
            'schema-validation': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'JSON Schema validation'
            },
            'experimental-ai-fix': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'AI-powered JSON error fixing'
            },
            'new-tree-view': {
                enabled: false,
                rolloutPercentage: 25,
                description: 'New tree view component'
            },
            'performance-mode': {
                enabled: true,
                rolloutPercentage: 50,
                description: 'Enhanced performance for large files'
            }
        };

        for (const [key, config] of Object.entries(defaults)) {
            this.flags.set(key, config);
        }
    }

    async loadLocalOverrides() {
        const { featureFlagOverrides = {} } = await chrome.storage.local.get('featureFlagOverrides');
        for (const [key, value] of Object.entries(featureFlagOverrides)) {
            this.overrides.set(key, value);
        }
    }

    async determineUserBucket() {
        let { userId } = await chrome.storage.local.get('userId');

        if (!userId) {
            userId = crypto.randomUUID();
            await chrome.storage.local.set({ userId });
        }

        this.userId = userId;
        this.userBucket = this.hashToBucket(userId);
    }

    hashToBucket(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) % 100;
    }

    // =====================
    // FLAG CHECKING
    // =====================

    isEnabled(flagName) {
        if (!this.initialized) {
            console.warn('[FeatureFlags] Not initialized, returning false');
            return false;
        }

        // Check for override first
        if (this.overrides.has(flagName)) {
            return this.overrides.get(flagName);
        }

        const flag = this.flags.get(flagName);
        if (!flag) {
            console.warn(`[FeatureFlags] Unknown flag: ${flagName}`);
            return false;
        }

        // Check if globally disabled
        if (!flag.enabled) {
            return false;
        }

        // Check percentage rollout
        if (flag.rolloutPercentage < 100) {
            const flagBucket = this.hashToBucket(`${this.userId}-${flagName}`);
            return flagBucket < flag.rolloutPercentage;
        }

        return true;
    }

    // =====================
    // FLAG MANAGEMENT
    // =====================

    async setOverride(flagName, enabled) {
        this.overrides.set(flagName, enabled);

        const { featureFlagOverrides = {} } = await chrome.storage.local.get('featureFlagOverrides');
        featureFlagOverrides[flagName] = enabled;
        await chrome.storage.local.set({ featureFlagOverrides });
    }

    async clearOverride(flagName) {
        this.overrides.delete(flagName);

        const { featureFlagOverrides = {} } = await chrome.storage.local.get('featureFlagOverrides');
        delete featureFlagOverrides[flagName];
        await chrome.storage.local.set({ featureFlagOverrides });
    }

    async clearAllOverrides() {
        this.overrides.clear();
        await chrome.storage.local.remove('featureFlagOverrides');
    }

    // =====================
    // FLAG INFO
    // =====================

    getAllFlags() {
        const result = {};
        for (const [key, config] of this.flags) {
            result[key] = {
                ...config,
                currentlyEnabled: this.isEnabled(key),
                hasOverride: this.overrides.has(key),
                overrideValue: this.overrides.get(key)
            };
        }
        return result;
    }

    getFlagInfo(flagName) {
        const flag = this.flags.get(flagName);
        if (!flag) return null;

        return {
            ...flag,
            currentlyEnabled: this.isEnabled(flagName),
            hasOverride: this.overrides.has(flagName),
            overrideValue: this.overrides.get(flagName)
        };
    }

    // =====================
    // CONDITIONAL EXECUTION
    // =====================

    ifEnabled(flagName, enabledFn, disabledFn = null) {
        if (this.isEnabled(flagName)) {
            return enabledFn();
        } else if (disabledFn) {
            return disabledFn();
        }
        return null;
    }

    async ifEnabledAsync(flagName, enabledFn, disabledFn = null) {
        if (this.isEnabled(flagName)) {
            return await enabledFn();
        } else if (disabledFn) {
            return await disabledFn();
        }
        return null;
    }
}

// Export singleton
const featureFlags = new FeatureFlags();
export { featureFlags, FeatureFlags };
