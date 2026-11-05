/**
 * JSON Formatter Pro - Update Notifier
 * Update announcements and what's new (md-22 Agent 50)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

import { versionManager } from './version-manager.js';
import { changelogGenerator } from './changelog-generator.js';

class UpdateNotifier {
    constructor() {
        this.STORAGE_KEY = 'updateNotifications';
    }

    // =====================
    // UPDATE DETECTION
    // =====================

    async checkForUpdates() {
        const updateInfo = await versionManager.trackVersion();

        if (updateInfo.type === 'install') {
            await this.handleInstall();
            return { isNew: true, type: 'install' };
        }

        if (updateInfo.type === 'update') {
            await this.handleUpdate(updateInfo.from, updateInfo.to, updateInfo.updateType);
            return { isNew: true, type: 'update', updateType: updateInfo.updateType };
        }

        return { isNew: false, type: 'none' };
    }

    async handleInstall() {
        await this.saveNotification({
            type: 'install',
            version: versionManager.getVersion(),
            timestamp: Date.now(),
            seen: false
        });
    }

    async handleUpdate(fromVersion, toVersion, updateType) {
        await versionManager.logVersionChange(fromVersion, toVersion, updateType);

        await this.saveNotification({
            type: 'update',
            updateType,
            fromVersion,
            toVersion,
            timestamp: Date.now(),
            seen: false
        });
    }

    // =====================
    // NOTIFICATION MANAGEMENT
    // =====================

    async saveNotification(notification) {
        const { updateNotifications = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
        updateNotifications.push(notification);

        // Keep last 10
        const trimmed = updateNotifications.slice(-10);
        await chrome.storage.local.set({ [this.STORAGE_KEY]: trimmed });
    }

    async getPendingNotifications() {
        const { updateNotifications = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
        return updateNotifications.filter(n => !n.seen);
    }

    async markAsSeen(timestamp) {
        const { updateNotifications = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
        const updated = updateNotifications.map(n =>
            n.timestamp === timestamp ? { ...n, seen: true } : n
        );
        await chrome.storage.local.set({ [this.STORAGE_KEY]: updated });
    }

    async markAllAsSeen() {
        const { updateNotifications = [] } = await chrome.storage.local.get(this.STORAGE_KEY);
        const updated = updateNotifications.map(n => ({ ...n, seen: true }));
        await chrome.storage.local.set({ [this.STORAGE_KEY]: updated });
    }

    // =====================
    // WHAT'S NEW CONTENT
    // =====================

    async getWhatsNewContent() {
        const pending = await this.getPendingNotifications();

        if (pending.length === 0) {
            return null;
        }

        const latestNotification = pending[pending.length - 1];
        const changelog = changelogGenerator.getCurrentChangelog();

        return {
            notification: latestNotification,
            changelog: changelogGenerator.formatForPopup(changelog),
            fullChangelog: changelog
        };
    }

    // =====================
    // UI COMPONENTS
    // =====================

    async shouldShowWhatsNew() {
        const pending = await this.getPendingNotifications();
        return pending.length > 0;
    }

    createWhatsNewModal(content) {
        const modal = document.createElement('div');
        modal.className = 'whats-new-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'whats-new-title');

        const isInstall = content.notification.type === 'install';
        const title = isInstall ? 'Welcome to JSON Formatter Pro!' : `What's New in v${content.changelog.version}`;

        modal.innerHTML = `
      <div class="whats-new-content">
        <header>
          <h2 id="whats-new-title">${title}</h2>
          <button class="close-btn" aria-label="Close">&times;</button>
        </header>
        
        <div class="whats-new-body">
          ${content.changelog.highlights.length > 0 ? `
            <div class="highlights">
              ${content.changelog.highlights.map(h => `<p class="highlight">${h}</p>`).join('')}
            </div>
          ` : ''}
          
          <ul class="changes-list">
            ${content.changelog.changes.map(c => `
              <li class="change change-${c.type}">
                <span class="change-badge">${c.type}</span>
                ${c.text}
              </li>
            `).join('')}
          </ul>
          
          ${content.changelog.totalChanges > 5 ? `
            <p class="more-changes">
              And ${content.changelog.totalChanges - 5} more changes...
            </p>
          ` : ''}
        </div>
        
        <footer>
          <button class="btn-primary got-it-btn">Got it!</button>
          ${!isInstall ? '<a href="#" class="view-changelog">View full changelog</a>' : ''}
        </footer>
      </div>
    `;

        return modal;
    }

    async showWhatsNew() {
        const content = await this.getWhatsNewContent();
        if (!content) return null;

        const modal = this.createWhatsNewModal(content);
        document.body.appendChild(modal);

        // Event handlers
        const closeModal = async () => {
            await this.markAsSeen(content.notification.timestamp);
            modal.remove();
        };

        modal.querySelector('.close-btn').addEventListener('click', closeModal);
        modal.querySelector('.got-it-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        return modal;
    }

    // =====================
    // BADGE MANAGEMENT
    // =====================

    async updateBadge() {
        const pending = await this.getPendingNotifications();

        if (pending.length > 0) {
            await chrome.action.setBadgeText({ text: 'NEW' });
            await chrome.action.setBadgeBackgroundColor({ color: '#7C3AED' });
        } else {
            await chrome.action.setBadgeText({ text: '' });
        }
    }

    async clearBadge() {
        await chrome.action.setBadgeText({ text: '' });
    }
}

// Export singleton
const updateNotifier = new UpdateNotifier();
export { updateNotifier, UpdateNotifier };
