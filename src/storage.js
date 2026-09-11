// Minimal localStorage-backed implementation of the get/set/delete/list
// storage API that App.jsx was originally written against (Claude Artifacts'
// window.storage). This keeps App.jsx unchanged when running as a normal
// static web app.
//
// IMPORTANT LIMITATION: localStorage is per-browser, per-device. There is no
// real "shared" storage here — the `shared` flag is accepted for API
// compatibility but everything is stored locally to whoever opens the page.
// That means the calendar/history will only show reports saved on *that*
// device/browser, not a team-wide shared log. If you need everyone on the
// team to see the same calendar, swap this file for a real backend (Firebase,
// Supabase, or your own API) — the four functions below are the only surface
// area the rest of the app talks to.

const PREFIX = "pmfr:";

function allKeysWithPrefix(prefix) {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const fullKey = localStorage.key(i);
    if (fullKey && fullKey.startsWith(PREFIX)) {
      const bare = fullKey.slice(PREFIX.length);
      if (bare.startsWith(prefix)) keys.push(bare);
    }
  }
  return keys;
}

const storage = {
  async get(key /*, shared */) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) {
      // Match the documented behavior: missing keys throw, not return null.
      throw new Error(`storage key not found: ${key}`);
    }
    return { key, value: raw };
  },

  async set(key, value /*, shared */) {
    localStorage.setItem(PREFIX + key, value);
    return { key, value };
  },

  async delete(key /*, shared */) {
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: true };
  },

  async list(prefix = "" /*, shared */) {
    return { keys: allKeysWithPrefix(prefix), prefix };
  },
};

export default storage;
