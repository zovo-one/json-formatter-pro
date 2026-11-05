/**
 * JSON Formatter Pro - Accessibility Auditor
 * WCAG compliance checking (md-21 Agent 45)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

import { ContrastChecker } from './contrast-checker.js';

class A11yAuditor {
    constructor() {
        this.issues = [];
    }

    // =====================
    // FULL AUDIT
    // =====================

    runAudit(container = document.body) {
        this.issues = [];

        this.checkImages(container);
        this.checkButtons(container);
        this.checkLinks(container);
        this.checkForms(container);
        this.checkHeadings(container);
        this.checkLandmarks(container);
        this.checkFocusVisible(container);
        this.checkContrast(container);

        return {
            score: this.calculateScore(),
            issues: this.issues,
            summary: this.getSummary()
        };
    }

    // =====================
    // IMAGE CHECKS
    // =====================

    checkImages(container) {
        const images = container.querySelectorAll('img');

        images.forEach(img => {
            if (!img.alt && !img.getAttribute('role')?.includes('presentation')) {
                this.addIssue('error', 'Image missing alt text', img, 'WCAG 1.1.1');
            }

            // Check for redundant alt if inside a link with text
            if (img.alt && img.closest('a')?.textContent.trim() === img.alt) {
                this.addIssue('warning', 'Image alt duplicates link text', img, 'WCAG 1.1.1');
            }
        });

        // Check SVGs
        const svgs = container.querySelectorAll('svg');
        svgs.forEach(svg => {
            const hasTitle = svg.querySelector('title');
            const hasAriaLabel = svg.getAttribute('aria-label');
            const isHidden = svg.getAttribute('aria-hidden') === 'true';

            if (!hasTitle && !hasAriaLabel && !isHidden) {
                this.addIssue('warning', 'SVG may need accessible name', svg, 'WCAG 1.1.1');
            }
        });
    }

    // =====================
    // BUTTON CHECKS
    // =====================

    checkButtons(container) {
        const buttons = container.querySelectorAll('button, [role="button"]');

        buttons.forEach(btn => {
            const hasText = btn.textContent?.trim();
            const hasAriaLabel = btn.getAttribute('aria-label');
            const hasAriaLabelledby = btn.getAttribute('aria-labelledby');

            if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
                this.addIssue('error', 'Button has no accessible name', btn, 'WCAG 4.1.2');
            }
        });
    }

    // =====================
    // LINK CHECKS
    // =====================

    checkLinks(container) {
        const links = container.querySelectorAll('a[href]');

        links.forEach(link => {
            // Check for empty links
            if (!link.textContent?.trim() && !link.getAttribute('aria-label')) {
                this.addIssue('error', 'Link has no text', link, 'WCAG 2.4.4');
            }

            // Check for generic text
            const text = link.textContent?.toLowerCase().trim();
            if (['click here', 'read more', 'here', 'more'].includes(text)) {
                this.addIssue('warning', 'Link text is not descriptive', link, 'WCAG 2.4.4');
            }

            // Check external links
            if (link.target === '_blank' && !link.getAttribute('rel')?.includes('noopener')) {
                this.addIssue('warning', 'External link missing rel="noopener"', link, 'Security');
            }
        });
    }

    // =====================
    // FORM CHECKS
    // =====================

    checkForms(container) {
        // Labels
        const inputs = container.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            const id = input.id;
            const ariaLabel = input.getAttribute('aria-label');
            const ariaLabelledby = input.getAttribute('aria-labelledby');
            const hasLabel = id && container.querySelector(`label[for="${id}"]`);
            const type = input.type;

            // Skip hidden and submit types
            if (type === 'hidden' || type === 'submit' || type === 'button') return;

            if (!hasLabel && !ariaLabel && !ariaLabelledby) {
                this.addIssue('error', 'Form field has no label', input, 'WCAG 1.3.1');
            }
        });

        // Required fields
        const requiredFields = container.querySelectorAll('[required], [aria-required="true"]');
        requiredFields.forEach(field => {
            const label = container.querySelector(`label[for="${field.id}"]`);
            if (label && !label.textContent.includes('*') && !field.getAttribute('aria-describedby')) {
                this.addIssue('warning', 'Required field indication may be unclear', field, 'WCAG 3.3.2');
            }
        });
    }

    // =====================
    // HEADING CHECKS
    // =====================

    checkHeadings(container) {
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let levels = [];

        headings.forEach(h => {
            const level = parseInt(h.tagName[1]);
            levels.push(level);
        });

        // Check for skipped levels
        for (let i = 1; i < levels.length; i++) {
            if (levels[i] - levels[i - 1] > 1) {
                this.addIssue('warning', `Heading level skipped from H${levels[i - 1]} to H${levels[i]}`,
                    headings[i], 'WCAG 1.3.1');
            }
        }

        // Check for multiple H1s
        const h1s = container.querySelectorAll('h1');
        if (h1s.length > 1) {
            this.addIssue('warning', 'Page has multiple H1 elements', h1s[1], 'Best Practice');
        }
    }

    // =====================
    // LANDMARK CHECKS
    // =====================

    checkLandmarks(container) {
        const main = container.querySelector('main, [role="main"]');
        const nav = container.querySelector('nav, [role="navigation"]');

        if (!main) {
            this.addIssue('warning', 'Page has no main landmark', container, 'WCAG 1.3.1');
        }

        // Check for multiple navs without labels
        const navs = container.querySelectorAll('nav, [role="navigation"]');
        if (navs.length > 1) {
            navs.forEach(nav => {
                if (!nav.getAttribute('aria-label') && !nav.getAttribute('aria-labelledby')) {
                    this.addIssue('warning', 'Multiple navs should have unique labels', nav, 'WCAG 1.3.1');
                }
            });
        }
    }

    // =====================
    // FOCUS CHECKS
    // =====================

    checkFocusVisible(container) {
        // Check for outline:none without alternative
        const interactives = container.querySelectorAll('a, button, input, select, textarea, [tabindex]');

        interactives.forEach(el => {
            const styles = getComputedStyle(el);
            const outlineStyle = styles.outlineStyle;

            // This is a basic check - full check would need :focus state
            if (el.getAttribute('style')?.includes('outline: none') ||
                el.getAttribute('style')?.includes('outline:none')) {
                this.addIssue('warning', 'Element may lack visible focus indicator', el, 'WCAG 2.4.7');
            }
        });
    }

    // =====================
    // CONTRAST CHECK
    // =====================

    checkContrast(container) {
        const result = ContrastChecker.auditPage();

        result.details.slice(0, 10).forEach(issue => {
            this.addIssue('error',
                `Insufficient contrast (${issue.ratio}:1, needs ${issue.required}:1)`,
                null,
                'WCAG 1.4.3',
                issue.selector
            );
        });
    }

    // =====================
    // UTILITIES
    // =====================

    addIssue(severity, message, element, wcag, selector = null) {
        this.issues.push({
            severity,
            message,
            wcag,
            selector: selector || this.getSelector(element)
        });
    }

    getSelector(element) {
        if (!element) return 'unknown';
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName?.toLowerCase() || 'unknown';
    }

    calculateScore() {
        const errors = this.issues.filter(i => i.severity === 'error').length;
        const warnings = this.issues.filter(i => i.severity === 'warning').length;

        let score = 100 - (errors * 10) - (warnings * 2);
        return Math.max(0, Math.min(100, score));
    }

    getSummary() {
        const errors = this.issues.filter(i => i.severity === 'error');
        const warnings = this.issues.filter(i => i.severity === 'warning');
        const score = this.calculateScore();

        return {
            score,
            grade: score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'F',
            errors: errors.length,
            warnings: warnings.length,
            topIssues: this.issues.slice(0, 5)
        };
    }
}

// Export
const a11yAuditor = new A11yAuditor();
export { a11yAuditor, A11yAuditor };
