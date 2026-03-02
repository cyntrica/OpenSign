/**
 * Vite Plugin: OpenSign Plugin Discovery
 *
 * Scans plugins/*/manifest.json at build time and generates a virtual module
 * (`virtual:opensign-plugins`) that exports:
 *   - pluginRoutes: Array of { path, component (lazy), auth }
 *   - pluginMenuItems: Array of { icon, title, position, ... }
 *   - pluginThemeOverrides: Object of theme overrides for DaisyUI
 */

import fs from 'node:fs';
import path from 'node:path';

const VIRTUAL_MODULE_ID = 'virtual:opensign-plugins';
const RESOLVED_ID = '\0' + VIRTUAL_MODULE_ID;

export default function opensignPlugins() {
  const pluginsDir = path.resolve(process.cwd(), '../../plugins');

  function discoverPlugins() {
    const plugins = [];
    if (!fs.existsSync(pluginsDir)) return plugins;

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
      const manifestPath = path.join(pluginsDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        manifest._dirName = entry.name;
        plugins.push(manifest);
      } catch (e) {
        console.warn(`[opensign-plugins] Failed to parse ${manifestPath}:`, e.message);
      }
    }
    return plugins;
  }

  function generateModule(plugins) {
    const imports = [];
    const routeEntries = [];
    const menuEntries = [];
    let themeOverrides = {};

    for (const plugin of plugins) {
      const fe = plugin.frontend;
      if (!fe) continue;

      // Pages -> lazy routes
      if (fe.pages) {
        for (const page of fe.pages) {
          const importPath = `../../../plugins/${plugin._dirName}/${page.component}`;
          const varName = `${plugin.namespace}_${page.path.replace(/\//g, '_').replace(/^_/, '')}`;
          imports.push(
            `const ${varName} = lazy(() => import("${importPath}"));`
          );
          routeEntries.push(
            `{ path: "${page.path}", component: ${varName}, auth: ${page.auth ?? true}, plugin: "${plugin.namespace}" }`
          );
        }
      }

      // Menu items
      if (fe.menuItems) {
        for (const item of fe.menuItems) {
          menuEntries.push(JSON.stringify({
            icon: item.icon,
            title: item.title,
            target: '_self',
            pageType: '',
            description: '',
            objectId: item.path || item.title.toLowerCase().replace(/\s+/g, ''),
            position: item.position || 'end',
            plugin: plugin.namespace,
          }));
        }
      }

      // Theme overrides
      if (fe.themeOverrides) {
        for (const [themeName, overrides] of Object.entries(fe.themeOverrides)) {
          if (!themeOverrides[themeName]) themeOverrides[themeName] = {};
          Object.assign(themeOverrides[themeName], overrides);
        }
      }
    }

    return `
import { lazy } from "react";

${imports.join('\n')}

export const pluginRoutes = [${routeEntries.join(',\n  ')}];

export const pluginMenuItems = [${menuEntries.join(',\n  ')}];

export const pluginThemeOverrides = ${JSON.stringify(themeOverrides)};
`;
  }

  return {
    name: 'opensign-plugins',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        const plugins = discoverPlugins();
        console.log(
          `[opensign-plugins] Generating virtual module with ${plugins.length} plugin(s)`
        );
        return generateModule(plugins);
      }
    },
    // Watch plugin manifests for HMR during dev
    configureServer(server) {
      if (fs.existsSync(pluginsDir)) {
        server.watcher.add(path.join(pluginsDir, '*/manifest.json'));
      }
    },
  };
}
