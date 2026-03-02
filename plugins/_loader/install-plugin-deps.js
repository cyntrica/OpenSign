#!/usr/bin/env node
/**
 * Plugin Dependency Installer
 *
 * Scans plugin package.json files and installs their dependencies
 * into the current project's node_modules.
 *
 * Run as a postinstall script from the server or client package.json:
 *   "postinstall": "node ../../plugins/_loader/install-plugin-deps.js"
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.resolve(__dirname, '..');

function collectDeps(target) {
  const allDeps = {};
  if (!fs.existsSync(pluginsDir)) return allDeps;

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const pkgPath = path.join(pluginsDir, entry.name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = target === 'server' ? pkg.serverDependencies || pkg.dependencies : pkg.clientDependencies;
      if (deps) {
        Object.assign(allDeps, deps);
      }
    } catch (e) {
      console.warn(`[plugin-deps] Failed to read ${pkgPath}:`, e.message);
    }
  }
  return allDeps;
}

function main() {
  // Determine which target we're installing for based on cwd
  const cwd = process.cwd();
  const target = cwd.includes('OpenSignServer') ? 'server' : 'client';
  const deps = collectDeps(target);
  const depEntries = Object.entries(deps);

  if (depEntries.length === 0) {
    console.log(`[plugin-deps] No ${target} plugin dependencies to install.`);
    return;
  }

  const installArgs = depEntries.map(([name, version]) => `${name}@${version}`).join(' ');
  console.log(`[plugin-deps] Installing ${target} plugin dependencies: ${installArgs}`);

  try {
    execSync(`npm install --no-save ${installArgs}`, {
      cwd,
      stdio: 'inherit',
    });
    console.log(`[plugin-deps] Successfully installed ${depEntries.length} plugin dep(s).`);
  } catch (err) {
    console.error(`[plugin-deps] Failed to install dependencies:`, err.message);
    // Don't exit with error code — postinstall failure shouldn't break the whole install
  }
}

main();
