/**
 * JSON Formatter Pro - Secure Storage
 * Encrypted storage utilities (md-18 Agent 29)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class SecureStorage {
    // =====================
    // ENCRYPTION
    // =====================

    /**
     * Generate encryption key
     */
    static async generateKey() {
        const key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
        return key;
    }

    /**
     * Export key for storage
     */
    static async exportKey(key) {
        const exported = await crypto.subtle.exportKey('raw', key);
        return this.arrayBufferToBase64(exported);
    }

    /**
     * Import key from storage
     */
    static async importKey(keyData) {
        const raw = this.base64ToArrayBuffer(keyData);
        return crypto.subtle.importKey(
            'raw',
            raw,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data
     */
    static async encrypt(data, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(data));

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoded
        );

        return {
            iv: this.arrayBufferToBase64(iv),
            data: this.arrayBufferToBase64(encrypted)
        };
    }

    /**
     * Decrypt data
     */
    static async decrypt(encryptedData, key) {
        const iv = this.base64ToArrayBuffer(encryptedData.iv);
        const data = this.base64ToArrayBuffer(encryptedData.data);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        const decoded = new TextDecoder().decode(decrypted);
        return JSON.parse(decoded);
    }

    // =====================
    // SECURE STORAGE API
    // =====================

    /**
     * Store data securely
     */
    static async secureSet(keyName, value) {
        try {
            // Get or create encryption key
            let encKey = await this.getEncryptionKey();
            if (!encKey) {
                encKey = await this.createAndStoreEncryptionKey();
            }

            // Encrypt and store
            const encrypted = await this.encrypt(value, encKey);
            await chrome.storage.local.set({
                [`secure_${keyName}`]: encrypted
            });

            return { success: true };
        } catch (e) {
            console.error('[SecureStorage] Encryption failed:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Retrieve data securely
     */
    static async secureGet(keyName) {
        try {
            const encKey = await this.getEncryptionKey();
            if (!encKey) {
                return { success: false, error: 'No encryption key' };
            }

            const result = await chrome.storage.local.get(`secure_${keyName}`);
            const encrypted = result[`secure_${keyName}`];

            if (!encrypted) {
                return { success: true, data: null };
            }

            const decrypted = await this.decrypt(encrypted, encKey);
            return { success: true, data: decrypted };
        } catch (e) {
            console.error('[SecureStorage] Decryption failed:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Remove secure data
     */
    static async secureRemove(keyName) {
        await chrome.storage.local.remove(`secure_${keyName}`);
        return { success: true };
    }

    // =====================
    // KEY MANAGEMENT
    // =====================

    /**
     * Get encryption key from storage
     */
    static async getEncryptionKey() {
        const result = await chrome.storage.local.get('_encryptionKey');
        if (!result._encryptionKey) return null;
        return this.importKey(result._encryptionKey);
    }

    /**
     * Create and store new encryption key
     */
    static async createAndStoreEncryptionKey() {
        const key = await this.generateKey();
        const exported = await this.exportKey(key);
        await chrome.storage.local.set({ _encryptionKey: exported });
        return key;
    }

    // =====================
    // DATA PROTECTION
    // =====================

    /**
     * Sanitize data before storage
     */
    static sanitizeForStorage(data) {
        // Remove potential circular references
        const seen = new WeakSet();
        return JSON.parse(JSON.stringify(data, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            // Remove functions
            if (typeof value === 'function') {
                return undefined;
            }
            return value;
        }));
    }

    /**
     * Validate data size before storage
     */
    static validateStorageSize(data, maxBytes = 5 * 1024 * 1024) {
        const size = new Blob([JSON.stringify(data)]).size;
        return {
            valid: size <= maxBytes,
            size,
            maxBytes,
            message: size > maxBytes
                ? `Data exceeds ${this.formatSize(maxBytes)} limit`
                : null
        };
    }

    // =====================
    // UTILITIES
    // =====================

    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        return btoa(String.fromCharCode(...bytes));
    }

    static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    static formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Generate secure random ID
     */
    static generateSecureId(length = 32) {
        const array = new Uint8Array(length / 2);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Freeze to prevent tampering
Object.freeze(SecureStorage);

export { SecureStorage };
