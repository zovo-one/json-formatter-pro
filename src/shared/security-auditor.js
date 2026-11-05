/**
 * JSON Formatter Pro - Security Auditor
 * Comprehensive security audit (md-18 Agent 30)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

import { PermissionManager } from './permission-manager.js';

class SecurityAuditor {
    // =====================
    // AUDIT RUNNER
    // =====================

    /**
     * Run full security audit
     */
    static async runAudit() {
        const results = {
            timestamp: Date.now(),
            version: chrome.runtime.getManifest().version,
            checks: [],
            score: 0,
            grade: null,
            critical: [],
            warnings: [],
            passed: []
        };

        // Run all checks
        await this.checkCSP(results);
        await this.checkPermissions(results);
        await this.checkManifest(results);
        await this.checkStorageUsage(results);
        await this.checkDependencies(results);

        // Calculate score
        results.score = this.calculateScore(results.checks);
        results.grade = this.getGrade(results.score);

        return results;
    }

    // =====================
    // CSP CHECK
    // =====================

    async checkCSP(results) {
        const manifest = chrome.runtime.getManifest();
        const csp = manifest.content_security_policy;

        const check = {
            name: 'Content Security Policy',
            status: 'pass',
            details: []
        };

        if (!csp || !csp.extension_pages) {
            check.status = 'warning';
            check.details.push('No custom CSP defined, using defaults');
            results.warnings.push('Consider defining explicit CSP');
        } else {
            const policy = csp.extension_pages;

            // Check for unsafe directives
            if (policy.includes("'unsafe-inline'")) {
                check.status = 'fail';
                check.details.push("CSP contains 'unsafe-inline'");
                results.critical.push("Remove 'unsafe-inline' from CSP");
            }

            if (policy.includes("'unsafe-eval'")) {
                check.status = 'fail';
                check.details.push("CSP contains 'unsafe-eval'");
                results.critical.push("Remove 'unsafe-eval' from CSP");
            }

            if (check.status === 'pass') {
                check.details.push('CSP is properly configured');
                results.passed.push('CSP security');
            }
        }

        results.checks.push(check);
    }

    // =====================
    // PERMISSIONS CHECK
    // =====================

    static async checkPermissions(results) {
        const analysis = await PermissionManager.analyzePermissions();

        const check = {
            name: 'Permission Analysis',
            status: 'pass',
            details: []
        };

        // Check for critical permissions
        if (analysis.byRisk.critical.length > 0) {
            check.status = 'warning';
            check.details.push(`Critical permissions: ${analysis.byRisk.critical.join(', ')}`);
            results.warnings.push('Review critical permissions');
        }

        // Check for excessive permissions
        if (analysis.total > 10) {
            check.status = 'warning';
            check.details.push(`${analysis.total} permissions may be excessive`);
            results.warnings.push('Consider reducing permission count');
        }

        // Check for broad host permissions
        if (analysis.hostPermissions.includes('<all_urls>')) {
            check.status = 'warning';
            check.details.push('All URLs permission is very broad');
            results.warnings.push('Use specific host patterns instead of <all_urls>');
        }

        if (check.status === 'pass') {
            check.details.push(`${analysis.total} permissions, all low-risk`);
            results.passed.push('Permission minimization');
        }

        results.checks.push(check);
    }

    // =====================
    // MANIFEST CHECK
    // =====================

    static async checkManifest(results) {
        const manifest = chrome.runtime.getManifest();

        const check = {
            name: 'Manifest Configuration',
            status: 'pass',
            details: []
        };

        // Check manifest version
        if (manifest.manifest_version < 3) {
            check.status = 'fail';
            check.details.push('Using Manifest V2 (deprecated)');
            results.critical.push('Migrate to Manifest V3');
        } else {
            check.details.push('Using Manifest V3');
        }

        // Check for web accessible resources
        if (manifest.web_accessible_resources?.length > 0) {
            const wideOpen = manifest.web_accessible_resources.some(war =>
                war.matches?.includes('<all_urls>') || war.matches?.includes('*://*/*')
            );

            if (wideOpen) {
                check.status = 'warning';
                check.details.push('Web accessible resources open to all sites');
                results.warnings.push('Restrict web_accessible_resources matches');
            }
        }

        // Check for externally connectable
        if (manifest.externally_connectable?.matches?.includes('<all_urls>')) {
            check.status = 'fail';
            check.details.push('externally_connectable open to all URLs');
            results.critical.push('Restrict externally_connectable');
        }

        if (check.status === 'pass') {
            results.passed.push('Manifest security');
        }

        results.checks.push(check);
    }

    // =====================
    // STORAGE CHECK
    // =====================

    static async checkStorageUsage(results) {
        const check = {
            name: 'Storage Security',
            status: 'pass',
            details: []
        };

        // Check for sensitive data patterns in storage
        const localData = await chrome.storage.local.get(null);
        const keys = Object.keys(localData);

        const sensitivePatterns = ['password', 'token', 'secret', 'key', 'api_key'];
        const potentiallySensitive = keys.filter(k =>
            sensitivePatterns.some(p => k.toLowerCase().includes(p))
        );

        if (potentiallySensitive.length > 0) {
            check.status = 'warning';
            check.details.push(`Potentially sensitive keys: ${potentiallySensitive.join(', ')}`);
            results.warnings.push('Ensure sensitive data is encrypted');
        }

        // Check storage size
        const size = new Blob([JSON.stringify(localData)]).size;
        const sizeFormatted = this.formatSize(size);
        check.details.push(`Storage usage: ${sizeFormatted}`);

        if (check.status === 'pass') {
            results.passed.push('Storage security');
        }

        results.checks.push(check);
    }

    // =====================
    // DEPENDENCIES CHECK
    // =====================

    static async checkDependencies(results) {
        const check = {
            name: 'Code Security',
            status: 'pass',
            details: []
        };

        // Check if using external CDNs (not allowed in MV3)
        const manifest = chrome.runtime.getManifest();

        // MV3 doesn't allow remote code, so we're checking for sandbox usage
        if (manifest.sandbox?.pages?.length > 0) {
            check.status = 'warning';
            check.details.push('Sandbox pages in use');
            results.warnings.push('Review sandbox security settings');
        }

        // Check for background service worker
        if (manifest.background?.service_worker) {
            check.details.push('Using service worker (MV3 compliant)');
        }

        if (check.status === 'pass') {
            results.passed.push('Code security');
        }

        results.checks.push(check);
    }

    // =====================
    // SCORING
    // =====================

    static calculateScore(checks) {
        let score = 100;

        for (const check of checks) {
            if (check.status === 'fail') {
                score -= 20;
            } else if (check.status === 'warning') {
                score -= 5;
            }
        }

        return Math.max(0, score);
    }

    static getGrade(score) {
        if (score >= 95) return { letter: 'A+', label: 'Excellent' };
        if (score >= 90) return { letter: 'A', label: 'Great' };
        if (score >= 80) return { letter: 'B', label: 'Good' };
        if (score >= 70) return { letter: 'C', label: 'Fair' };
        if (score >= 60) return { letter: 'D', label: 'Needs Work' };
        return { letter: 'F', label: 'Critical Issues' };
    }

    // =====================
    // UTILITIES
    // =====================

    static formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Get audit summary for display
     */
    static async getSummary() {
        const audit = await this.runAudit();

        return {
            grade: audit.grade.letter,
            score: audit.score,
            criticalCount: audit.critical.length,
            warningCount: audit.warnings.length,
            passedCount: audit.passed.length,
            topIssue: audit.critical[0] || audit.warnings[0] || 'No issues found'
        };
    }
}

// Freeze to prevent tampering
Object.freeze(SecurityAuditor);

export { SecurityAuditor };
