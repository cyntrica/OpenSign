// Shared admin role check — reusable across plugins
// Throws Parse.Error if user is not authenticated or not an admin.
export async function requireAdmin(user) {
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User not authenticated.');
  }
  const extQuery = new Parse.Query('contracts_Users');
  extQuery.equalTo('UserId', user.toPointer());
  extQuery.select('UserRole');
  const extUser = await extQuery.first({ useMasterKey: true });
  const role = extUser?.get('UserRole');
  if (role !== 'contracts_Admin' && role !== 'contracts_OrgAdmin') {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin access required.');
  }
}
