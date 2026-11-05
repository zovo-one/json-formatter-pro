/**
 * JSON Formatter Pro - Deep Debug Agent 55
 * Performance Optimization and Bottleneck Prevention
 * 
 * Top 1% Edge Cases:
 * - Large JSON rendering (>1MB) with virtualization
 * - Syntax highlighting without freezing UI
 * - Tree rendering with depth limits
 * - Lazy loading for huge arrays
 * - Web Worker offloading for parsing
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class PerfGuard {
    constructor() {
        this.MAX_SYNC_SIZE = 100 * 1024; // 100KB sync processing
        this.MAX_TREE_DEPTH = 50;
        this.MAX_VISIBLE_NODES = 1000;
        this.CHUNK_SIZE = 50;
    }

    // =====================
    // LARGE JSON HANDLING
    // =====================

    /**
     * Check if JSON needs special handling
     */
    needsOptimization(jsonString) {
        if (typeof jsonString !== 'string') return false;

        return {
            isLarge: jsonString.length > this.MAX_SYNC_SIZE,
            size: jsonString.length,
            estimatedNodes: this.estimateNodes(jsonString),
            recommendWorker: jsonString.length > 500 * 1024, // >500KB
            recommendVirtualization: this.estimateNodes(jsonString) > 5000
        };
    }

    /**
     * Estimate number of nodes in JSON
     */
    estimateNodes(jsonString) {
        // Count structural characters as a rough estimate
        const brackets = (jsonString.match(/[{}\[\]]/g) || []).length;
        const colons = (jsonString.match(/:/g) || []).length;
        return Math.floor((brackets + colons) / 2);
    }

    // =====================
    // CHUNKED PROCESSING
    // =====================

    /**
     * Process array in chunks to prevent UI freezing
     * CRITICAL: For large arrays, process in batches
     */
    async processInChunks(array, processFn, options = {}) {
        const { chunkSize = this.CHUNK_SIZE, onProgress } = options;
        const results = [];

        for (let i = 0; i < array.length; i += chunkSize) {
            const chunk = array.slice(i, i + chunkSize);
            const chunkResults = await Promise.all(chunk.map(processFn));
            results.push(...chunkResults);

            // Yield to UI thread
            await this.yieldToMain();

            // Progress callback
            if (onProgress) {
                onProgress({
                    processed: Math.min(i + chunkSize, array.length),
                    total: array.length,
                    percentage: Math.round((Math.min(i + chunkSize, array.length) / array.length) * 100)
                });
            }
        }

        return results;
    }

    /**
     * Yield to main thread to prevent freezing
     */
    yieldToMain() {
        return new Promise(resolve => {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(resolve, { timeout: 50 });
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    // =====================
    // VIRTUALIZED RENDERING
    // =====================

    /**
     * Create virtualized list for large arrays
     * CRITICAL: Only render visible items
     */
    createVirtualList(items, options = {}) {
        const {
            containerHeight = 400,
            itemHeight = 24,
            renderItem = (item) => `<div>${item}</div>`,
            overscan = 5
        } = options;

        const totalHeight = items.length * itemHeight;
        let scrollTop = 0;

        const getVisibleRange = () => {
            const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
            const visibleCount = Math.ceil(containerHeight / itemHeight) + (overscan * 2);
            const end = Math.min(items.length, start + visibleCount);
            return { start, end };
        };

        const render = () => {
            const { start, end } = getVisibleRange();
            const visibleItems = items.slice(start, end);

            const topSpacer = start * itemHeight;
            const bottomSpacer = (items.length - end) * itemHeight;

            return {
                html: `
          <div style="height:${topSpacer}px"></div>
          ${visibleItems.map((item, i) => renderItem(item, start + i)).join('')}
          <div style="height:${bottomSpacer}px"></div>
        `,
                totalHeight,
                visibleRange: { start, end }
            };
        };

        return {
            render,
            setScrollTop: (top) => { scrollTop = top; return render(); },
            getStats: () => ({
                total: items.length,
                rendered: getVisibleRange().end - getVisibleRange().start
            })
        };
    }

    // =====================
    // SYNTAX HIGHLIGHTING
    // =====================

    /**
     * Highlight JSON in chunks to prevent freezing
     */
    async highlightJSONAsync(jsonString, options = {}) {
        const { maxLength = 50000 } = options;

        // Truncate for very large files
        if (jsonString.length > maxLength) {
            const truncated = jsonString.substring(0, maxLength);
            const highlighted = this.highlightJSONSync(truncated);
            return highlighted + `\n\n... [${jsonString.length - maxLength} more characters truncated]`;
        }

        // Split into lines and process in chunks
        const lines = jsonString.split('\n');
        const chunks = [];

        for (let i = 0; i < lines.length; i += 100) {
            const chunk = lines.slice(i, i + 100);
            chunks.push(chunk.map(line => this.highlightLine(line)).join('\n'));

            if (i % 500 === 0) {
                await this.yieldToMain();
            }
        }

        return chunks.join('\n');
    }

    /**
     * Synchronous highlighting for small JSON
     */
    highlightJSONSync(jsonString) {
        return jsonString
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"([^"\\]|\\.)*"(?=\s*:)/g, '<span class="key">$&</span>')
            .replace(/"([^"\\]|\\.)*"(?!\s*:)/g, '<span class="string">$&</span>')
            .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="number">$1</span>')
            .replace(/\b(true|false)\b/g, '<span class="boolean">$1</span>')
            .replace(/\bnull\b/g, '<span class="null">null</span>');
    }

    highlightLine(line) {
        return line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"([^"\\]|\\.)*"(?=\s*:)/g, '<span class="key">$&</span>')
            .replace(/"([^"\\]|\\.)*"(?!\s*:)/g, '<span class="string">$&</span>')
            .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="number">$1</span>')
            .replace(/\b(true|false)\b/g, '<span class="boolean">$1</span>')
            .replace(/\bnull\b/g, '<span class="null">null</span>');
    }

    // =====================
    // TREE RENDERING
    // =====================

    /**
     * Render tree with depth and count limits
     * CRITICAL: Prevents browser crash on huge JSON
     */
    renderTreeSafe(data, options = {}) {
        const {
            maxDepth = this.MAX_TREE_DEPTH,
            maxNodes = this.MAX_VISIBLE_NODES,
            collapseDepth = 3
        } = options;

        let nodeCount = 0;
        const limitReached = { depth: false, nodes: false };

        const renderNode = (value, key, depth, isLast) => {
            if (nodeCount >= maxNodes) {
                if (!limitReached.nodes) {
                    limitReached.nodes = true;
                    return '<div class="tree-limit">... more items hidden</div>';
                }
                return '';
            }

            nodeCount++;

            if (depth > maxDepth) {
                if (!limitReached.depth) {
                    limitReached.depth = true;
                    return '<div class="tree-limit">... depth limit reached</div>';
                }
                return '';
            }

            const isExpandable = value !== null && typeof value === 'object';
            const collapsed = depth >= collapseDepth;

            if (isExpandable) {
                const isArray = Array.isArray(value);
                const entries = isArray ? value : Object.entries(value);
                const count = isArray ? value.length : Object.keys(value).length;

                return `
          <div class="tree-node ${collapsed ? 'collapsed' : ''}">
            <div class="tree-row">
              <span class="tree-toggle">${collapsed ? '▶' : '▼'}</span>
              <span class="tree-key">${key}</span>
              <span class="tree-preview">${isArray ? `[${count}]` : `{${count}}`}</span>
            </div>
            <div class="tree-children" style="${collapsed ? 'display:none' : ''}">
              ${isArray
                        ? value.slice(0, 100).map((item, i) =>
                            renderNode(item, i, depth + 1, i === Math.min(value.length, 100) - 1)
                        ).join('')
                        : Object.entries(value).slice(0, 100).map(([k, v], i, arr) =>
                            renderNode(v, k, depth + 1, i === arr.length - 1)
                        ).join('')
                    }
              ${count > 100 ? `<div class="tree-limit">... ${count - 100} more items</div>` : ''}
            </div>
          </div>
        `;
            }

            const type = value === null ? 'null' : typeof value;
            const display = type === 'string' ? `"${value}"` : String(value);

            return `
        <div class="tree-node tree-leaf">
          <span class="tree-key">${key}</span>
          <span class="tree-value tree-${type}">${display}</span>
        </div>
      `;
        };

        return {
            html: renderNode(data, 'root', 0, true),
            stats: {
                nodesRendered: nodeCount,
                depthLimitReached: limitReached.depth,
                nodeLimitReached: limitReached.nodes
            }
        };
    }

    // =====================
    // PERFORMANCE METRICS
    // =====================

    /**
     * Measure function execution time
     */
    async measure(name, fn) {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;

        console.log(`[PerfGuard] ${name}: ${duration.toFixed(2)}ms`);

        return {
            result,
            duration,
            name
        };
    }

    /**
     * Get current performance summary
     */
    getPerformanceSummary() {
        const memory = performance.memory;

        return {
            heapUsed: memory ? `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB` : 'N/A',
            heapLimit: memory ? `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB` : 'N/A',
            timing: {
                domContentLoaded: performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart,
                load: performance.timing?.loadEventEnd - performance.timing?.navigationStart
            }
        };
    }
}

// Export singleton
const perfGuard = new PerfGuard();
export { perfGuard, PerfGuard };
