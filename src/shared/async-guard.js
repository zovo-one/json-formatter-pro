/**
 * JSON Formatter Pro - Deep Debug Agent 52
 * Race Condition Prevention and Async Safety
 * 
 * Top 1% Edge Cases:
 * - Debounced input with abort controller
 * - Promise cancellation patterns
 * - State machine for async operations
 * - Mutex for concurrent access
 * - Request deduplication
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class AsyncGuard {
    constructor() {
        this.pendingOperations = new Map();
        this.abortControllers = new Map();
        this.mutexLocks = new Map();
        this.requestCache = new Map();
    }

    // =====================
    // ABORTABLE OPERATIONS
    // =====================

    /**
     * Create an abortable async operation
     * CRITICAL: Prevents stale callback execution
     */
    createAbortable(operationId) {
        // Abort any existing operation with same ID
        this.abort(operationId);

        const controller = new AbortController();
        this.abortControllers.set(operationId, controller);

        return {
            signal: controller.signal,
            isAborted: () => controller.signal.aborted,
            abort: () => this.abort(operationId)
        };
    }

    /**
     * Abort a specific operation
     */
    abort(operationId) {
        const controller = this.abortControllers.get(operationId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(operationId);
        }
    }

    /**
     * Abort all pending operations
     */
    abortAll() {
        for (const [id, controller] of this.abortControllers) {
            controller.abort();
        }
        this.abortControllers.clear();
    }

    // =====================
    // DEBOUNCE WITH CANCELLATION
    // =====================

    /**
     * Enhanced debounce that cancels stale operations
     */
    debounce(fn, delay, operationId) {
        let timeoutId = null;

        return (...args) => {
            // Clear previous timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Abort previous async operation
            this.abort(operationId);

            return new Promise((resolve, reject) => {
                timeoutId = setTimeout(async () => {
                    const { signal, isAborted } = this.createAbortable(operationId);

                    try {
                        const result = await fn(...args, { signal });

                        // Check if aborted before resolving
                        if (!isAborted()) {
                            resolve(result);
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            reject(error);
                        }
                    }
                }, delay);
            });
        };
    }

    // =====================
    // MUTEX FOR CONCURRENT ACCESS
    // =====================

    /**
     * Acquire a mutex lock
     * CRITICAL: Prevents race conditions on shared state
     */
    async acquireLock(lockId, timeout = 5000) {
        const startTime = Date.now();

        while (this.mutexLocks.has(lockId)) {
            if (Date.now() - startTime > timeout) {
                throw new Error(`Lock timeout: ${lockId}`);
            }
            await this.sleep(10);
        }

        this.mutexLocks.set(lockId, Date.now());

        return {
            release: () => this.releaseLock(lockId)
        };
    }

    /**
     * Release a mutex lock
     */
    releaseLock(lockId) {
        this.mutexLocks.delete(lockId);
    }

    /**
     * Execute with lock
     */
    async withLock(lockId, fn) {
        const lock = await this.acquireLock(lockId);
        try {
            return await fn();
        } finally {
            lock.release();
        }
    }

    // =====================
    // REQUEST DEDUPLICATION
    // =====================

    /**
     * Deduplicate concurrent identical requests
     * CRITICAL: Prevents duplicate API calls
     */
    async dedupeRequest(cacheKey, requestFn, ttl = 1000) {
        // Return cached promise if exists and not expired
        const cached = this.requestCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.promise;
        }

        // Create new request
        const promise = requestFn();
        this.requestCache.set(cacheKey, {
            promise,
            timestamp: Date.now()
        });

        // Cleanup after TTL
        setTimeout(() => {
            this.requestCache.delete(cacheKey);
        }, ttl);

        return promise;
    }

    // =====================
    // SAFE ASYNC STATE
    // =====================

    /**
     * Create a state machine for async operations
     * States: idle -> loading -> success/error -> idle
     */
    createAsyncState(initialState = {}) {
        let state = {
            status: 'idle',
            data: null,
            error: null,
            ...initialState
        };

        const subscribers = new Set();

        const setState = (updates) => {
            state = { ...state, ...updates };
            for (const callback of subscribers) {
                callback(state);
            }
        };

        return {
            getState: () => ({ ...state }),
            subscribe: (callback) => {
                subscribers.add(callback);
                return () => subscribers.delete(callback);
            },

            startLoading: () => setState({ status: 'loading', error: null }),
            setSuccess: (data) => setState({ status: 'success', data, error: null }),
            setError: (error) => setState({ status: 'error', error, data: null }),
            reset: () => setState({ status: 'idle', data: null, error: null }),

            isLoading: () => state.status === 'loading',
            isSuccess: () => state.status === 'success',
            isError: () => state.status === 'error'
        };
    }

    // =====================
    // SAFE PROMISE PATTERNS
    // =====================

    /**
     * Promise with timeout
     */
    async withTimeout(promise, timeout, errorMessage = 'Operation timeout') {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(errorMessage)), timeout);
        });

        return Promise.race([promise, timeoutPromise]);
    }

    /**
     * Retry with exponential backoff
     */
    async retry(fn, options = {}) {
        const { maxAttempts = 3, baseDelay = 100, maxDelay = 5000 } = options;

        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt === maxAttempts) break;

                const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * Execute promises in sequence
     */
    async sequence(tasks) {
        const results = [];
        for (const task of tasks) {
            results.push(await task());
        }
        return results;
    }

    // =====================
    // UTILITIES
    // =====================

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup all pending operations
     */
    cleanup() {
        this.abortAll();
        this.mutexLocks.clear();
        this.requestCache.clear();
    }
}

// Export singleton
const asyncGuard = new AsyncGuard();
export { asyncGuard, AsyncGuard };
