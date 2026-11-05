/**
 * JSON Formatter Pro - Share Modal Component
 * UI for viral sharing (Agent 14)
 * 
 * @author Zovo (https://zovo.one)
 * @license MIT
 */

class ShareModal {
    constructor(viralEngine) {
        this.engine = viralEngine;
        this.modal = null;
    }

    async show(trigger = null) {
        const referralLink = await this.engine.getReferralLink();
        const shareUrls = await this.engine.getShareUrls();
        const stats = await this.engine.getReferralStats();

        const title = trigger?.message?.title || 'Share JSON Formatter Pro';
        const body = trigger?.message?.body || 'Help your colleagues work with JSON more efficiently.';

        this.modal = document.createElement('div');
        this.modal.className = 'jfp-share-modal';
        this.modal.innerHTML = `
      <div class="jfp-share-overlay" onclick="this.parentElement.remove()"></div>
      <div class="jfp-share-content">
        <button class="jfp-share-close" onclick="this.parentElement.parentElement.remove()">×</button>
        
        <div class="jfp-share-header">
          <div class="jfp-share-icon">🚀</div>
          <h2>${title}</h2>
          <p>${body}</p>
        </div>
        
        <div class="jfp-share-link-section">
          <label>Your referral link</label>
          <div class="jfp-share-link-row">
            <input type="text" value="${referralLink}" readonly id="jfp-referral-link" />
            <button onclick="copyReferralLink()" class="jfp-btn-copy">Copy</button>
          </div>
        </div>
        
        <div class="jfp-share-buttons">
          <a href="${shareUrls.twitter}" target="_blank" class="jfp-share-btn jfp-share-twitter">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Twitter
          </a>
          <a href="${shareUrls.linkedin}" target="_blank" class="jfp-share-btn jfp-share-linkedin">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
          <a href="${shareUrls.reddit}" target="_blank" class="jfp-share-btn jfp-share-reddit">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
            Reddit
          </a>
          <a href="${shareUrls.email}" class="jfp-share-btn jfp-share-email">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            Email
          </a>
        </div>
        
        ${stats.totalReferred > 0 ? `
          <div class="jfp-share-stats">
            <div class="jfp-stat">
              <span class="jfp-stat-value">${stats.totalReferred}</span>
              <span class="jfp-stat-label">Friends Invited</span>
            </div>
            <div class="jfp-stat">
              <span class="jfp-stat-value">${stats.proDaysEarned}</span>
              <span class="jfp-stat-label">Pro Days Earned</span>
            </div>
            <div class="jfp-stat">
              <span class="jfp-stat-value">${stats.tier.name}</span>
              <span class="jfp-stat-label">Your Tier</span>
            </div>
          </div>
        ` : ''}
        
        <div class="jfp-share-footer">
          <p>Earn 7 days of Pro for every friend who installs</p>
        </div>
      </div>
    `;

        document.body.appendChild(this.modal);

        // Add copy function to window
        window.copyReferralLink = () => {
            const input = document.getElementById('jfp-referral-link');
            input.select();
            navigator.clipboard.writeText(input.value);
            const btn = this.modal.querySelector('.jfp-btn-copy');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 2000);
        };
    }

    hide() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}

// CSS for share modal
const shareModalStyles = `
.jfp-share-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jfp-share-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.jfp-share-content {
  position: relative;
  background: #1e1e2e;
  border-radius: 16px;
  padding: 32px;
  max-width: 480px;
  width: 90%;
  color: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.jfp-share-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
}

.jfp-share-header {
  text-align: center;
  margin-bottom: 24px;
}

.jfp-share-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.jfp-share-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.jfp-share-header p {
  margin: 0;
  color: #888;
}

.jfp-share-link-section {
  margin-bottom: 24px;
}

.jfp-share-link-section label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.jfp-share-link-row {
  display: flex;
  gap: 8px;
}

.jfp-share-link-row input {
  flex: 1;
  padding: 12px;
  background: #2a2a3e;
  border: 1px solid #3a3a4e;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

.jfp-btn-copy {
  padding: 12px 20px;
  background: linear-gradient(135deg, #7C3AED, #6366f1);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.jfp-share-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.jfp-share-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #2a2a3e;
  border-radius: 12px;
  color: #fff;
  text-decoration: none;
  font-size: 12px;
  transition: transform 0.2s;
}

.jfp-share-btn:hover {
  transform: translateY(-2px);
}

.jfp-share-twitter:hover { background: #1DA1F2; }
.jfp-share-linkedin:hover { background: #0A66C2; }
.jfp-share-reddit:hover { background: #FF4500; }
.jfp-share-email:hover { background: #7C3AED; }

.jfp-share-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: #2a2a3e;
  border-radius: 12px;
}

.jfp-stat {
  text-align: center;
}

.jfp-stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #7C3AED;
}

.jfp-stat-label {
  font-size: 11px;
  color: #888;
}

.jfp-share-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #3a3a4e;
}

.jfp-share-footer p {
  margin: 0;
  font-size: 13px;
  color: #888;
}
`;

export { ShareModal, shareModalStyles };
