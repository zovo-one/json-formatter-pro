/**
 * JSON Formatter Pro - Permission Manager
 * Optional permissions handling (md-18 Agent 28)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class PermissionManager {
    // =====================
    // PERMISSION DEFINITIONS
    // =====================

    static RISK_LEVELS = {
        critical: [
            '<all_urls>',
            'webRequest',
            'webRequestBlocking',
            'nativeMessaging',
            'debugger',
            'management',
            'proxy'
        ],
        high: [
            'cookies',
            'history',
            'topSites',
            'bookmarks',
            'downloads',
            'tabs',
            'browsingData'
        ],
        medium: [
            'storage',
            'activeTab',
            'contextMenus',
            'notifications',
            'alarms',
            'scripting'
        ],
        low: [
            'clipboardRead',
            'clipboardWrite',
            'identity',
            'idle'
        ]
    };

    // =====================
    // PERMISSION CHECKS
    // =====================

    /**
     * Check if a permission is currently granted
     */
    static async hasPermission(permission) {
        return new Promise((resolve) => {
            chrome.permissions.contains({ permissions: [permission] }, (result) => {
                resolve(result);
            });
        });
    }

    /**
     * Check if a host permission is granted
     */
    static async hasHostPermission(origin) {
        return new Promise((resolve) => {
            chrome.permissions.contains({ origins: [origin] }, (result) => {
                resolve(result);
            });
        });
    }

    /**
     * Get all current permissions
     */
    static async getAllPermissions() {
        return new Promise((resolve) => {
            chrome.permissions.getAll((result) => {
                resolve(result);
            });
        });
    }

    // =====================
    // PERMISSION REQUESTS
    // =====================

    /**
     * Request permission with user prompt
     */
    static async requestPermission(permission) {
        return new Promise((resolve) => {
            chrome.permissions.request({ permissions: [permission] }, (granted) => {
                resolve(granted);
            });
        });
    }

    /**
     * Request host permission
     */
    static async requestHostPermission(origin) {
        return new Promise((resolve) => {
            chrome.permissions.request({ origins: [origin] }, (granted) => {
                resolve(granted);
            });
        });
    }

    /**
     * Request permission only when needed (lazy loading)
     */
    static async requestIfNeeded(permission, reason) {
        const hasIt = await this.hasPermission(permission);
        if (hasIt) {
            return { granted: true, wasAlreadyGranted: true };
        }

        // Log the request reason
        console.log(`[PermissionManager] Requesting ${permission}: ${reason}`);

        const granted = await this.requestPermission(permission);
        return { granted, wasAlreadyGranted: false };
    }

    // =====================
    // PERMISSION REMOVAL
    // =====================

    /**
     * Remove a permission
     */
    static async removePermission(permission) {
        return new Promise((resolve) => {
            chrome.permissions.remove({ permissions: [permission] }, (removed) => {
                resolve(removed);
            });
        });
    }

    /**
     * Remove unused permissions
     */
    static async cleanupUnusedPermissions(usedPermissions) {
        const current = await this.getAllPermissions();
        const removed = [];

        for (const perm of current.permissions || []) {
            if (!usedPermissions.includes(perm)) {
                const success = await this.removePermission(perm);
                if (success) {
                    removed.push(perm);
                }
            }
        }

        return removed;
    }

    // =====================
    // PERMISSION LISTENERS
    // =====================

    /**
     * Listen for permission changes
     */
    static onPermissionChange(callback) {
        chrome.permissions.onAdded.addListener((permissions) => {
            callback({ type: 'added', permissions });
        });

        chrome.permissions.onRemoved.addListener((permissions) => {
            callback({ type: 'removed', permissions });
        });
    }

    // =====================
    // ANALYSIS
    // =====================

    /**
     * Get risk level for a permission
     */
    static getRiskLevel(permission) {
        for (const [level, perms] of Object.entries(this.RISK_LEVELS)) {
            if (perms.includes(permission)) {
                return level;
            }
        }
        return 'unknown';
    }

    /**
     * Analyze current permissions for security audit
     */
    static async analyzePermissions() {
        const current = await this.getAllPermissions();
        const analysis = {
            total: 0,
            byRisk: { critical: [], high: [], medium: [], low: [], unknown: [] },
            hostPermissions: current.origins || [],
            recommendations: []
        };

        for (const perm of current.permissions || []) {
            analysis.total++;
            const risk = this.getRiskLevel(perm);
            analysis.byRisk[risk].push(perm);
        }

        // Generate recommendations
        if (analysis.byRisk.critical.length > 0) {
            analysis.recommendations.push({
                severity: 'high',
                message: `Critical permissions detected: ${analysis.byRisk.critical.join(', ')}`,
                action: 'Review if these are absolutely necessary'
            });
        }

        if (analysis.hostPermissions.includes('<all_urls>')) {
            analysis.recommendations.push({
                severity: 'high',
                message: 'All URLs permission is very broad',
                action: 'Consider using specific host patterns'
            });
        }

        return analysis;
    }
}

// Freeze to prevent tampering
Object.freeze(PermissionManager);

export { PermissionManager };
