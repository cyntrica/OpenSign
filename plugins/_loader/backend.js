// OpenSign Plugin Loader (Backend)
//
// Scans plugin manifest.json files, registers Cloud Functions, triggers,
// Express routes, scheduled jobs, and runs plugin setup() entry points.
//
// Called from cloud/main.js at server startup.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGINS_DIR = path.resolve(__dirname, '..');

// ─── Path Validation (Finding #10 — prevent path traversal) ─────────────────

function validatePluginPath(handlerPath, pluginDir) {
  const resolved = path.resolve(handlerPath);
  if (!resolved.startsWith(pluginDir + path.sep) && resolved !== pluginDir) {
    throw new Error(`[plugins] Path traversal blocked: ${handlerPath} resolves outside plugin directory`);
  }
  return resolved;
}

// ─── Route Method Whitelist (Finding #33) ────────────────────────────────────
const ALLOWED_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// ─── Hook Registry ───────────────────────────────────────────────────────────
const hookRegistry = {};

export function registerHook(event, handler) {
  if (!hookRegistry[event]) hookRegistry[event] = [];
  hookRegistry[event].push(handler);
}

/**
 * Run all handlers for an event sequentially (waterfall).
 * `before*` hooks can throw to abort the operation.
 * Returns the (potentially modified) payload.
 */
export async function runHooks(event, payload) {
  const handlers = hookRegistry[event] || [];
  let result = payload;
  for (const handler of handlers) {
    result = (await handler(result)) ?? result;
  }
  return result;
}

// ─── Plugin Discovery ────────────────────────────────────────────────────────

function discoverPlugins() {
  const plugins = [];
  if (!fs.existsSync(PLUGINS_DIR)) return plugins;

  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue; // skip _loader

    const manifestPath = path.join(PLUGINS_DIR, entry.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      manifest._dir = path.join(PLUGINS_DIR, entry.name);
      plugins.push(manifest);
    } catch (err) {
      console.error(`[plugins] Failed to parse ${manifestPath}:`, err.message);
    }
  }
  return plugins;
}

// ─── Registration Functions ──────────────────────────────────────────────────

const _registeredFunctions = new Set(); // Finding #51 — track defined function names

async function registerFunctions(manifest) {
  const { namespace, backend } = manifest;
  if (!backend?.functions) return;

  for (const fn of backend.functions) {
    const handlerPath = validatePluginPath(path.join(manifest._dir, fn.file), manifest._dir);
    const mod = await import(handlerPath);
    const handler = mod.default || mod;
    const fnName = `${namespace}_${fn.name}`;
    // Finding #51 — warn on duplicate function names
    if (_registeredFunctions.has(fnName)) {
      console.warn(`[plugins] Duplicate function name: ${fnName} (from ${manifest.name}) — overwriting previous definition`);
    }
    _registeredFunctions.add(fnName);
    Parse.Cloud.define(fnName, handler);
    console.log(`[plugins] Registered function: ${fnName}`);
  }
}

// Finding #52 — Classes that commonly have core triggers; plugin triggers on these
// may conflict with core behavior. Full isolation would require a hook-chain
// architecture which is too invasive for now.
const CORE_TRIGGER_CLASSES = ['_User', '_Session', '_Role', '_Installation', 'contracts_Document'];

async function registerTriggers(manifest) {
  const { backend } = manifest;
  if (!backend?.triggers) return;

  for (const trigger of backend.triggers) {
    const handlerPath = validatePluginPath(path.join(manifest._dir, trigger.file), manifest._dir);
    const mod = await import(handlerPath);
    const handler = mod.default || mod;

    // Finding #52 — warn when a plugin registers a trigger on a class likely used by core
    if (CORE_TRIGGER_CLASSES.includes(trigger.className)) {
      console.warn(
        `[plugins] ${manifest.name}: Registering ${trigger.type} on core class "${trigger.className}" — may conflict with core triggers`
      );
    }

    switch (trigger.type) {
      case 'beforeSave':
        Parse.Cloud.beforeSave(trigger.className, handler);
        break;
      case 'afterSave':
        Parse.Cloud.afterSave(trigger.className, handler);
        break;
      case 'beforeDelete':
        Parse.Cloud.beforeDelete(trigger.className, handler);
        break;
      case 'afterDelete':
        Parse.Cloud.afterDelete(trigger.className, handler);
        break;
      case 'afterFind':
        Parse.Cloud.afterFind(trigger.className, handler);
        break;
      default:
        console.warn(`[plugins] Unknown trigger type: ${trigger.type}`);
    }
    console.log(`[plugins] Registered trigger: ${trigger.type} on ${trigger.className}`);
  }
}

async function registerRoutes(manifest, expressApp) {
  const { namespace, backend } = manifest;
  if (!backend?.routes || !expressApp) return;

  for (const route of backend.routes) {
    // Finding #54 — skip routes with missing method
    if (!route.method) {
      console.warn(`[plugins] Route missing method in ${manifest.name}, skipping`);
      continue;
    }

    const handlerPath = validatePluginPath(path.join(manifest._dir, route.file), manifest._dir);
    const mod = await import(handlerPath);
    const handler = mod.default || mod;
    const fullPath = `/plugins/${namespace}${route.path}`;
    const method = route.method.toLowerCase();

    // Finding #33 — only allow safe HTTP methods
    if (!ALLOWED_METHODS.includes(method)) {
      console.warn(`[plugins] Disallowed HTTP method "${method}" in ${manifest.name} for route ${route.path}, skipping`);
      continue;
    }

    if (typeof expressApp[method] === 'function') {
      expressApp[method](fullPath, handler);
      console.log(`[plugins] Registered route: ${method.toUpperCase()} ${fullPath}`);
    }
  }
}

async function registerJobs(manifest) {
  const { namespace, backend } = manifest;
  if (!backend?.jobs) return;

  for (const job of backend.jobs) {
    const handlerPath = validatePluginPath(path.join(manifest._dir, job.file), manifest._dir);
    const mod = await import(handlerPath);
    const handler = mod.default || mod;
    const jobName = `${namespace}_${job.name}`;
    Parse.Cloud.job(jobName, handler);
    console.log(`[plugins] Registered job: ${jobName}${job.schedule ? ` (${job.schedule})` : ''}`);
  }
}

async function registerAppHooks(manifest) {
  if (!manifest.hooks) return;

  for (const hook of manifest.hooks) {
    const handlerPath = validatePluginPath(path.join(manifest._dir, hook.handler), manifest._dir);
    const mod = await import(handlerPath);
    const handler = mod.default || mod;
    registerHook(hook.event, handler);
    console.log(`[plugins] Registered hook: ${hook.event} (${manifest.name})`);
  }
}

async function runEntryPoint(manifest, context) {
  const { backend } = manifest;
  if (!backend?.entry) return;

  const entryPath = validatePluginPath(path.join(manifest._dir, backend.entry), manifest._dir);
  if (!fs.existsSync(entryPath)) return;

  const mod = await import(entryPath);
  if (typeof mod.setup === 'function') {
    await mod.setup(context);
    console.log(`[plugins] Ran setup() for: ${manifest.name}`);
  }
}

function checkEnvVars(manifest) {
  if (!manifest.envVars) return;
  const missing = [];
  for (const v of manifest.envVars) {
    if (v.required && !process.env[v.name]) {
      missing.push(v.name);
    }
  }
  if (missing.length > 0) {
    console.warn(
      `[plugins] ${manifest.name}: Missing required env vars: ${missing.join(', ')}`
    );
  }
}

// ─── Main Loader ─────────────────────────────────────────────────────────────

export async function loadPlugins(Utils) {
  const expressApp = globalThis.__pluginExpressApp;
  const plugins = discoverPlugins();

  // Finding #51 — sort by priority (lower = earlier; default 100)
  plugins.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

  if (plugins.length === 0) {
    console.log('[plugins] No plugins found.');
    return;
  }

  console.log(`[plugins] Discovered: ${plugins.map(p => p.name).join(', ')}`);

  for (const manifest of plugins) {
    try {
      checkEnvVars(manifest);

      const context = {
        Parse,
        Utils,
        expressApp,
        hooks: { register: registerHook, run: runHooks },
        config: {
          namespace: manifest.namespace,
          pluginDir: manifest._dir,
        },
      };

      await registerFunctions(manifest);
      await registerTriggers(manifest);
      await registerRoutes(manifest, expressApp);
      await registerJobs(manifest);
      await registerAppHooks(manifest);
      await runEntryPoint(manifest, context);

      console.log(`[plugins] Loaded: ${manifest.name} v${manifest.version}`);
    } catch (err) {
      console.error(`[plugins] Failed to load ${manifest.name}:`, err);
    }
  }

  // After all plugins have run setup(), load the branded appName from
  // branding_Settings into the server-wide Utils.appName export.
  // This ensures emails, certificates, etc. use the branded name.
  if (typeof Utils?.initAppNameFromBranding === 'function') {
    await Utils.initAppNameFromBranding();
  }
}
