/**
 * JSON Formatter Pro - Contrast Checker
 * Color contrast validation for WCAG (md-21 Agent 44)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ContrastChecker {
    // =====================
    // WCAG RATIOS
    // =====================

    static RATIOS = {
        AA_NORMAL: 4.5,      // Normal text (< 18pt or < 14pt bold)
        AA_LARGE: 3,         // Large text (>= 18pt or >= 14pt bold)
        AAA_NORMAL: 7,       // Enhanced normal text
        AAA_LARGE: 4.5,      // Enhanced large text
        UI_COMPONENTS: 3     // Non-text contrast (WCAG 1.4.11)
    };

    // =====================
    // COLOR PARSING
    // =====================

    static parseColor(color) {
        // Handle hex
        if (color.startsWith('#')) {
            return this.hexToRgb(color);
        }

        // Handle rgb/rgba
        if (color.startsWith('rgb')) {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3])
                };
            }
        }

        // Handle named colors (subset)
        const namedColors = {
            white: { r: 255, g: 255, b: 255 },
            black: { r: 0, g: 0, b: 0 },
            red: { r: 255, g: 0, b: 0 },
            green: { r: 0, g: 128, b: 0 },
            blue: { r: 0, g: 0, b: 255 }
        };

        return namedColors[color.toLowerCase()] || { r: 0, g: 0, b: 0 };
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) {
            // Handle shorthand (#fff)
            const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
            if (shorthand) {
                return {
                    r: parseInt(shorthand[1] + shorthand[1], 16),
                    g: parseInt(shorthand[2] + shorthand[2], 16),
                    b: parseInt(shorthand[3] + shorthand[3], 16)
                };
            }
            return { r: 0, g: 0, b: 0 };
        }
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        };
    }

    // =====================
    // LUMINANCE CALCULATION
    // =====================

    static getRelativeLuminance(rgb) {
        const sRGB = [rgb.r, rgb.g, rgb.b].map(v => {
            v = v / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    }

    // =====================
    // CONTRAST RATIO
    // =====================

    static getContrastRatio(color1, color2) {
        const rgb1 = typeof color1 === 'string' ? this.parseColor(color1) : color1;
        const rgb2 = typeof color2 === 'string' ? this.parseColor(color2) : color2;

        const l1 = this.getRelativeLuminance(rgb1);
        const l2 = this.getRelativeLuminance(rgb2);

        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);

        return (lighter + 0.05) / (darker + 0.05);
    }

    // =====================
    // WCAG COMPLIANCE
    // =====================

    static checkCompliance(foreground, background, options = {}) {
        const ratio = this.getContrastRatio(foreground, background);
        const isLargeText = options.isLargeText || false;
        const isUIComponent = options.isUIComponent || false;

        let required;
        let level;

        if (isUIComponent) {
            required = this.RATIOS.UI_COMPONENTS;
            level = 'UI';
        } else if (isLargeText) {
            required = this.RATIOS.AA_LARGE;
            level = 'AA Large';
        } else {
            required = this.RATIOS.AA_NORMAL;
            level = 'AA Normal';
        }

        const passes = ratio >= required;
        const passesAAA = isLargeText
            ? ratio >= this.RATIOS.AAA_LARGE
            : ratio >= this.RATIOS.AAA_NORMAL;

        return {
            ratio: Math.round(ratio * 100) / 100,
            required,
            level,
            passes,
            passesAAA,
            recommendation: passes ? null : this.getRecommendation(ratio, required)
        };
    }

    static getRecommendation(current, required) {
        const deficit = required - current;
        if (deficit < 1) {
            return 'Slightly darken the foreground or lighten the background';
        } else if (deficit < 2) {
            return 'Significantly increase contrast - consider different colors';
        } else {
            return 'Colors are too similar - choose contrasting colors';
        }
    }

    // =====================
    // ELEMENT CHECKING
    // =====================

    static checkElement(element) {
        const styles = getComputedStyle(element);
        const foreground = styles.color;
        const background = this.getEffectiveBackground(element);
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = parseInt(styles.fontWeight);

        // Large text: >= 18pt (24px) or >= 14pt (18.67px) bold
        const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700);

        return this.checkCompliance(foreground, background, { isLargeText });
    }

    static getEffectiveBackground(element) {
        let bg = getComputedStyle(element).backgroundColor;
        let el = element;

        // Walk up the tree to find a non-transparent background
        while (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
            el = el.parentElement;
            if (!el) {
                return 'rgb(255, 255, 255)'; // Default to white
            }
            bg = getComputedStyle(el).backgroundColor;
        }

        return bg;
    }

    // =====================
    // BATCH CHECKING
    // =====================

    static auditPage() {
        const issues = [];
        const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, label');

        textElements.forEach((el, index) => {
            const result = this.checkElement(el);
            if (!result.passes) {
                issues.push({
                    element: el.tagName.toLowerCase(),
                    selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : `${el.tagName.toLowerCase()}:nth-child(${index + 1})`,
                    ratio: result.ratio,
                    required: result.required,
                    text: el.textContent?.substring(0, 50)
                });
            }
        });

        return {
            total: textElements.length,
            issues: issues.length,
            details: issues
        };
    }
}

// Export
export { ContrastChecker };
