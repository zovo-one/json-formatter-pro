/**
 * JSON Formatter Pro - Version Manager
 * Semantic versioning and display (md-22 Agent 46)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class VersionManager {
    constructor() {
        this.manifest = null;
    }

    // =====================
    // INITIALIZATION
    // =====================

    init() {
        this.manifest = chrome.runtime.getManifest();
        return this;
    }

    // =====================
    // VERSION GETTERS
    // =====================

    getVersion() {
        if (!this.manifest) this.init();
        return this.manifest.version;
    }

    getDisplayVersion() {
        if (!this.manifest) this.init();
        return this.manifest.version_name || this.manifest.version;
    }

    getVersionParts() {
        const parts = this.getVersion().split('.').map(Number);
        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0,
            build: parts[3] || 0
        };
    }

    // =====================
    // VERSION CHECKS
    // =====================

    isPreRelease() {
        const displayVersion = this.getDisplayVersion();
        return /alpha|beta|rc|canary|dev/i.test(displayVersion);
    }

    getPreReleaseType() {
        const displayVersion = this.getDisplayVersion();
        if (/alpha/i.test(displayVersion)) return 'alpha';
        if (/beta/i.test(displayVersion)) return 'beta';
        if (/rc/i.test(displayVersion)) return 'rc';
        if (/canary/i.test(displayVersion)) return 'canary';
        if (/dev/i.test(displayVersion)) return 'dev';
        return null;
    }

    // =====================
    // VERSION COMPARISON
    // =====================

    compare(version1, version2) {
        const parts1 = version1.split('.').map(Number);
        const parts2 = version2.split('.').map(Number);
        const maxLength = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < maxLength; i++) {
            const a = parts1[i] || 0;
            const b = parts2[i] || 0;
            if (a > b) return 1;
            if (a < b) return -1;
        }
        return 0;
    }

    isNewerThan(otherVersion) {
        return this.compare(this.getVersion(), otherVersion) > 0;
    }

    isOlderThan(otherVersion) {
        return this.compare(this.getVersion(), otherVersion) < 0;
    }

    // =====================
    // UPDATE DETECTION
    // =====================

    async checkForUpdate(previousVersion) {
        const currentVersion = this.getVersion();

        if (!previousVersion) {
            return { type: 'install', from: null, to: currentVersion };
        }

        if (this.isNewerThan(previousVersion)) {
            const parts1 = previousVersion.split('.').map(Number);
            const parts2 = currentVersion.split('.').map(Number);

            let updateType = 'build';
            if (parts2[0] > parts1[0]) updateType = 'major';
            else if (parts2[1] > parts1[1]) updateType = 'minor';
            else if (parts2[2] > parts1[2]) updateType = 'patch';

            return { type: 'update', updateType, from: previousVersion, to: currentVersion };
        }

        return { type: 'none', from: previousVersion, to: currentVersion };
    }

    async trackVersion() {
        const { lastVersion } = await chrome.storage.local.get('lastVersion');
        const result = await this.checkForUpdate(lastVersion);

        await chrome.storage.local.set({
            lastVersion: this.getVersion(),
            lastVersionCheck: Date.now()
        });

        return result;
    }

    // =====================
    // VERSION DISPLAY
    // =====================

    getVersionBadge() {
        const version = this.getDisplayVersion();
        let badgeClass = 'version-stable';

        if (this.isPreRelease()) {
            const type = this.getPreReleaseType();
            badgeClass = `version-${type}`;
        }

        return {
            html: `<span class="version-badge ${badgeClass}">${version}</span>`,
            text: version,
            class: badgeClass
        };
    }

    getVersionInfo() {
        return {
            version: this.getVersion(),
            displayVersion: this.getDisplayVersion(),
            parts: this.getVersionParts(),
            isPreRelease: this.isPreRelease(),
            preReleaseType: this.getPreReleaseType(),
            extensionId: chrome.runtime.id,
            name: this.manifest?.name || 'Unknown'
        };
    }

    // =====================
    // VERSION HISTORY
    // =====================

    async getVersionHistory() {
        const { versionHistory = [] } = await chrome.storage.local.get('versionHistory');
        return versionHistory;
    }

    async logVersionChange(fromVersion, toVersion, changeType) {
        const { versionHistory = [] } = await chrome.storage.local.get('versionHistory');

        versionHistory.push({
            from: fromVersion,
            to: toVersion,
            type: changeType,
            timestamp: Date.now()
        });

        // Keep last 20 versions
        const trimmed = versionHistory.slice(-20);
        await chrome.storage.local.set({ versionHistory: trimmed });
    }
}

// Export singleton
const versionManager = new VersionManager();
versionManager.init();

export { versionManager, VersionManager };
