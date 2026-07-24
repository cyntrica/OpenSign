// SMS plugin setup
// Creates schemas for settings, message log, consent, user preferences, and webhook events.

export async function setup({ Parse, config }) {
  console.log('[sms] Running setup...');

  // All write CLPs are disabled (empty object = no one).
  // All writes use useMasterKey:true, so authorization is enforced in
  // application code (cloud functions and hooks).
  const authReadCLP = {
    get: { requiresAuthentication: true },
    find: { requiresAuthentication: true },
    count: { requiresAuthentication: true },
    create: {},
    update: {},
    delete: {},
    addField: {},
  };

  // 1. Per-tenant SMS configuration
  await ensureSchema('sms_Settings', (schema) => {
    schema.addPointer('TenantId', 'partners_Tenant');
    // Twilio credentials (per-tenant, fall back to env vars)
    schema.addString('twilioAccountSid');
    schema.addString('twilioAuthToken');
    schema.addString('twilioPhoneNumber');
    schema.addString('twilioVerifyServiceSid');
    // Feature toggles
    schema.addBoolean('enabled');
    schema.addBoolean('notifySignersOnSend');
    schema.addBoolean('notifyCreatorOnSign');
    schema.addBoolean('notifyAllOnComplete');
    schema.addBoolean('enableSmsOtp');
    schema.addBoolean('enableReminders');
    schema.addString('fromNumber');
    schema.addObject('templates');
    schema.setCLP(authReadCLP);
  });

  // 2. SMS message log + delivery tracking
  await ensureSchema('sms_Message', (schema) => {
    schema.addPointer('TenantId', 'partners_Tenant');
    schema.addString('twilioSid');
    schema.addString('to');
    schema.addString('from');
    schema.addString('body');
    schema.addString('event');
    schema.addString('status');
    schema.addString('errorCode');
    schema.addString('errorMessage');
    schema.addPointer('DocumentId', 'contracts_Document');
    schema.addPointer('ContactId', 'contracts_Contactbook');
    schema.addDate('sentAt');
    schema.addDate('deliveredAt');
    schema.setCLP(authReadCLP);
  });

  // 3. TCPA consent tracking (opt-in/opt-out per phone per tenant)
  await ensureSchema('sms_Consent', (schema) => {
    schema.addString('phone');
    schema.addPointer('TenantId', 'partners_Tenant');
    schema.addBoolean('consented');
    schema.addString('source');
    schema.addDate('consentedAt');
    schema.addDate('revokedAt');
    schema.setCLP(authReadCLP);
  });

  // 4. Per-user notification preferences
  await ensureSchema('sms_UserPreference', (schema) => {
    schema.addPointer('UserId', '_User');
    schema.addPointer('TenantId', 'partners_Tenant');
    schema.addBoolean('signRequests');
    schema.addBoolean('signNotifications');
    schema.addBoolean('completions');
    schema.addBoolean('reminders');
    schema.setCLP(authReadCLP);
  });

  // 5. Webhook idempotency tracking
  await ensureSchema('sms_WebhookEvent', (schema) => {
    schema.addString('messageSid');
    schema.addString('status');
    schema.addDate('processedAt');
    schema.setCLP({
      find: {},
      get: {},
      create: {},
      update: {},
      delete: {},
      addField: {},
    });
  });

  console.log('[sms] Setup complete.');
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
