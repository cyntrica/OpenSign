// Shared admin role gate for membership plugin cloud functions.
const ADMIN_ROLES = ['contracts_Admin', 'contracts_OrgAdmin'];

export default async function requireAdmin(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Authentication required.');
  }
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', request.user.toPointer());
  extQuery.select('UserRole');
  const extUser = await extQuery.first({ useMasterKey: true });
  const role = extUser?.get('UserRole');
  if (!ADMIN_ROLES.includes(role)) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin access required.');
  }
}
