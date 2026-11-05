/**
 * JSON Formatter Pro - Timing Utilities
 * Debounce, throttle, and scheduling (md-20 Agent 40)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

// =====================
// DEBOUNCE
// =====================

/**
 * Debounce function - delays execution until after wait ms of no calls
 */
export function debounce(fn, wait = 100) {
    let timeoutId = null;

    const debounced = function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), wait);
    };

    debounced.cancel = () => {
        clearTimeout(timeoutId);
        timeoutId = null;
    };

    debounced.flush = function (...args) {
        clearTimeout(timeoutId);
        fn.apply(this, args);
    };

    return debounced;
}

/**
 * Debounce with leading edge execution
 */
export function debounceLeading(fn, wait = 100) {
    let timeoutId = null;
    let lastCall = 0;

    return function (...args) {
        const now = Date.now();

        if (now - lastCall >= wait) {
            fn.apply(this, args);
        }

        lastCall = now;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            lastCall = 0;
        }, wait);
    };
}

// =====================
// THROTTLE
// =====================

/**
 * Throttle function - limits execution to once per limit ms
 */
export function throttle(fn, limit = 100) {
    let inThrottle = false;
    let lastArgs = null;
    let lastThis = null;

    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;

            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    fn.apply(lastThis, lastArgs);
                    lastArgs = null;
                    lastThis = null;
                }
            }, limit);
        } else {
            lastArgs = args;
            lastThis = this;
        }
    };
}

/**
 * RAF throttle - limits to animation frame rate
 */
export function throttleRAF(fn) {
    let rafId = null;
    let lastArgs = null;

    return function (...args) {
        lastArgs = args;

        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                fn.apply(this, lastArgs);
                rafId = null;
            });
        }
    };
}

// =====================
// SCHEDULING
// =====================

/**
 * Run task on next idle period
 */
export function runWhenIdle(fn, options = {}) {
    const timeout = options.timeout || 2000;

    if ('requestIdleCallback' in window) {
        return requestIdleCallback(fn, { timeout });
    }

    // Fallback for older browsers
    return setTimeout(fn, 1);
}

/**
 * Batch operations to run during idle time
 */
export function createIdleQueue(options = {}) {
    const tasks = [];
    let running = false;
    const batchSize = options.batchSize || 5;
    const timeout = options.timeout || 50;

    const process = (deadline) => {
        while (
            tasks.length > 0 &&
            (deadline.timeRemaining() > 0 || deadline.didTimeout)
        ) {
            const batch = tasks.splice(0, batchSize);
            for (const task of batch) {
                try {
                    task();
                } catch (e) {
                    console.error('[IdleQueue] Task error:', e);
                }
            }
        }

        if (tasks.length > 0) {
            runWhenIdle(process, { timeout });
        } else {
            running = false;
        }
    };

    return {
        add(task) {
            tasks.push(task);
            if (!running) {
                running = true;
                runWhenIdle(process, { timeout });
            }
        },

        clear() {
            tasks.length = 0;
            running = false;
        },

        get pending() {
            return tasks.length;
        }
    };
}

// =====================
// DELAYS
// =====================

/**
 * Promise-based delay
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for next animation frame
 */
export function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * Wait for next idle period
 */
export function nextIdle(timeout = 1000) {
    return new Promise(resolve => {
        runWhenIdle(resolve, { timeout });
    });
}

// =====================
// RETRY LOGIC
// =====================

/**
 * Retry a function with exponential backoff
 */
export async function retry(fn, options = {}) {
    const maxAttempts = options.maxAttempts || 3;
    const baseDelay = options.baseDelay || 1000;
    const maxDelay = options.maxDelay || 30000;

    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;

            if (attempt === maxAttempts) {
                throw lastError;
            }

            const delayMs = Math.min(
                baseDelay * Math.pow(2, attempt - 1),
                maxDelay
            );

            await delay(delayMs);
        }
    }

    throw lastError;
}

// =====================
// RATE LIMITING
// =====================

/**
 * Create a rate-limited function
 */
export function rateLimit(fn, callsPerSecond = 10) {
    const interval = 1000 / callsPerSecond;
    let lastCall = 0;
    const queue = [];
    let processing = false;

    const processQueue = async () => {
        if (processing || queue.length === 0) return;
        processing = true;

        while (queue.length > 0) {
            const now = Date.now();
            const timeSinceLast = now - lastCall;

            if (timeSinceLast < interval) {
                await delay(interval - timeSinceLast);
            }

            const { args, resolve, reject } = queue.shift();
            lastCall = Date.now();

            try {
                const result = await fn(...args);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        processing = false;
    };

    return function (...args) {
        return new Promise((resolve, reject) => {
            queue.push({ args, resolve, reject });
            processQueue();
        });
    };
}

// =====================
// TIMEOUT
// =====================

/**
 * Wrap a promise with a timeout
 */
export function withTimeout(promise, ms, errorMessage = 'Operation timed out') {
    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(errorMessage));
        }, ms);
    });

    return Promise.race([promise, timeoutPromise])
        .finally(() => clearTimeout(timeoutId));
}

// Export all utilities
export const TimingUtils = {
    debounce,
    debounceLeading,
    throttle,
    throttleRAF,
    runWhenIdle,
    createIdleQueue,
    delay,
    nextFrame,
    nextIdle,
    retry,
    rateLimit,
    withTimeout
};
