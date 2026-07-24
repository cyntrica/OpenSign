// Cloud Function: sms_saveSmsPreferences
// Saves the calling user's per-notification-type SMS preferences.
// Any authenticated user can save their own preferences.

export default async function saveSmsPreferences(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Authentication required.');
  }

  const { signRequests, signNotifications, completions, reminders } = request.params;

  // Validate all fields are boolean
  const fields = { signRequests, signNotifications, completions, reminders };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `${key} must be a boolean.`);
    }
  }

  // Find or create preference record
  const prefQuery = new Parse.Query('sms_UserPreference');
  prefQuery.equalTo('UserId', request.user.toPointer());
  let pref = await prefQuery.first({ useMasterKey: true });

  if (!pref) {
    pref = new Parse.Object('sms_UserPreference');
    pref.set('UserId', request.user.toPointer());

    // Resolve tenant
    const extQuery = new Parse.Query('contracts_Users');
    extQuery.equalTo('UserId', request.user.toPointer());
    extQuery.select('TenantId');
    const extUser = await extQuery.first({ useMasterKey: true });
    const tenantId = extUser?.get('TenantId')?.id;
    if (tenantId) {
      pref.set('TenantId', {
        __type: 'Pointer',
        className: 'partners_Tenant',
        objectId: tenantId,
      });
    }
  }

  // Set fields (only if provided)
  if (signRequests !== undefined) pref.set('signRequests', signRequests);
  if (signNotifications !== undefined) pref.set('signNotifications', signNotifications);
  if (completions !== undefined) pref.set('completions', completions);
  if (reminders !== undefined) pref.set('reminders', reminders);

  await pref.save(null, { useMasterKey: true });

  return { success: true };
}
