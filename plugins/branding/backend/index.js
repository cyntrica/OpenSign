// Branding plugin setup
// Creates branding_Settings schema and seeds default row

import { BRANDING_DEFAULTS } from './lib/defaults.js';

export async function setup({ Parse, config }) {
  console.log('[branding] Running setup...');

  // 1. Ensure schema exists
  await ensureSchema('branding_Settings', (schema) => {
    schema.addString('appName');
    schema.addString('logoUrl');
    schema.addString('logoDarkUrl');
    schema.addString('faviconUrl');
    schema.addString('footerText');
    schema.addString('footerUrl');
    schema.addString('emailLogoUrl');
    schema.addString('loginImageUrl');
    schema.addArray('socialLinks');
    schema.addObject('themeLight');
    schema.addObject('themeDark');
    schema.setCLP({
      get: { '*': true },
      find: { '*': true },
      count: { '*': true },
      create: {},
      update: {},
      delete: {},
      addField: {},
    });
  });

  // 2. Seed default branding row if none exists
  const query = new Parse.Query('branding_Settings');
  const existing = await query.first({ useMasterKey: true });

  if (!existing) {
    const settings = new Parse.Object('branding_Settings');
    for (const [key, value] of Object.entries(BRANDING_DEFAULTS)) {
      settings.set(key, value);
    }
    await settings.save(null, { useMasterKey: true });
    console.log('[branding] Seeded default branding settings.');
  }

  console.log('[branding] Setup complete.');
}

async function ensureSchema(className, setupFn) {
  const schema = new Parse.Schema(className);
  setupFn(schema);
  try {
    await schema.save();
  } catch {
    try {
      await schema.update();
    } catch (e) {
      // Schema already up to date
    }
  }
}
