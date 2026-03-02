/**
 * hello_ping Cloud Function
 *
 * A simple test function that confirms the plugin system is working.
 * Call from frontend: Parse.Cloud.run('hello_ping')
 */

export default async function ping(req) {
  return {
    status: 'ok',
    plugin: 'hello-world',
    message: 'Plugin system is working!',
    timestamp: new Date().toISOString(),
    user: req.user?.get('username') || 'anonymous',
  };
}
