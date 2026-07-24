/**
 * Tailwind/DaisyUI Theme Override Helper
 *
 * Reads theme overrides from all plugin manifests and returns
 * an object that can be spread into the DaisyUI themes config.
 *
 * Usage in tailwind.config.js:
 *   const pluginOverrides = require('./../../plugins/_loader/tailwind-plugin-overrides');
 *   // then merge into your themes
 */

const fs = require('node:fs');
const path = require('node:path');

const pluginsDir = path.resolve(__dirname, '..');

function getThemeOverrides() {
  const overrides = {};
  if (!fs.existsSync(pluginsDir)) return overrides;

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const manifestPath = path.join(pluginsDir, entry.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const themeOverrides = manifest?.frontend?.themeOverrides;
      if (!themeOverrides) continue;
      for (const [themeName, values] of Object.entries(themeOverrides)) {
        if (!overrides[themeName]) overrides[themeName] = {};
        Object.assign(overrides[themeName], values);
      }
    } catch (e) {
      console.warn('[plugins] Failed to parse manifest:', manifestPath, e.message);
    }
  }
  return overrides;
}

module.exports = getThemeOverrides;
