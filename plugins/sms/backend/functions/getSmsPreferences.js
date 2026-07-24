// Cloud Function: sms_getSmsPreferences
// Returns the calling user's per-notification-type SMS preferences.
// Any authenticated user can read their own preferences.

const DEFAULT_PREFERENCES = {
  signRequests: true,
  signNotifications: true,
  completions: true,
  reminders: true,
};

export default async function getSmsPreferences(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Authentication required.');
  }

  // Resolve tenant to scope the query
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('TenantId');
  const extUser = await extQuery.first({ useMasterKey: true });
  const tenantId = extUser?.get('TenantId')?.id;

  const prefQuery = new Parse.Query('sms_UserPreference');
  prefQuery.equalTo('UserId', request.user.toPointer());
  if (tenantId) {
    prefQuery.equalTo('TenantId', {
      __type: 'Pointer',
      className: 'partners_Tenant',
      objectId: tenantId,
    });
  }
  const pref = await prefQuery.first({ useMasterKey: true });

  if (!pref) {
    return { ...DEFAULT_PREFERENCES, _isDefault: true };
  }

  return {
    signRequests: pref.get('signRequests') ?? DEFAULT_PREFERENCES.signRequests,
    signNotifications: pref.get('signNotifications') ?? DEFAULT_PREFERENCES.signNotifications,
    completions: pref.get('completions') ?? DEFAULT_PREFERENCES.completions,
    reminders: pref.get('reminders') ?? DEFAULT_PREFERENCES.reminders,
  };
}
