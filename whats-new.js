/**
 * JSON Formatter Pro - whats-new interstitial controller.
 * External (not inline) to satisfy the extension CSP: script-src 'self'.
 * Records dismiss and upgrade intent so the popup can pick up where the user left off.
 */
(function () {
  'use strict';

  var hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  function save(obj) {
    if (!hasChrome) { return; }
    try { chrome.storage.local.set(obj); } catch (_e) {}
  }

  // Mark the notice as seen so it never auto-opens twice, even if the SW flag was lost.
  save({ whatsNewSeen: true, whatsNewSeenAt: Date.now() });

  var later = document.getElementById('laterBtn');
  if (later) {
    later.addEventListener('click', function (e) {
      e.preventDefault();
      save({ upgradeDeclinedAt: Date.now() });
      try { window.close(); } catch (_e) {}
    });
  }

  var pro = document.getElementById('getProBtn');
  if (pro) {
    pro.addEventListener('click', function () {
      save({ upgradeIntentAt: Date.now(), upgradeSource: 'whatsnew_pro' });
    });
  }

  var lifetime = document.getElementById('getLifetimeBtn');
  if (lifetime) {
    lifetime.addEventListener('click', function () {
      save({ upgradeIntentAt: Date.now(), upgradeSource: 'whatsnew_lifetime' });
    });
  }
})();
