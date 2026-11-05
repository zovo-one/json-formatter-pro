globalThis.ZOVO_WHATS_NEW = Object.freeze({
  "version": "1.0.13",
  "name": "JSON Formatter Pro",
  "id": "gbnadjkeegkhbcoeaeaoedpojlcknnhp",
  "slug": "json-formatter-pro",
  "date": "2026-10-31",
  "changes": [
    {
      "type": "fixed",
      "text": "The Sort keys setting now works. When it is on, your JSON is sorted by key name as you format it."
    },
    {
      "type": "fixed",
      "text": "Pro history no longer shrinks to 10 entries when the license server cannot be reached."
    },
    {
      "type": "improved",
      "text": "The What's new page is redesigned. It shows each change in plain words, and the popup has a link to it at the bottom."
    },
    {
      "type": "improved",
      "text": "This page now opens at most once in 30 days, and a checkbox at the bottom turns it off."
    },
    {
      "type": "new",
      "text": "After real use, the popup may ask for your honest rating, at most twice. It never asks in your first 3 days, and Not now hides it for 90 days."
    }
  ],
  "tips": [
    "Paste raw JSON and it turns into a readable tree.",
    "You can fold each part of the tree open and shut.",
    "The data you format stays in your browser."
  ],
  "signal": {
    "area": "local",
    "key": "history",
    "path": "#",
    "min": 10,
    "line": "Your format history holds {n} entries."
  },
  "installedAt": {
    "area": "local",
    "key": "installedAt"
  },
  "icon": "icon.png"
});
