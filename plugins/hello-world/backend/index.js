/**
 * Hello World Plugin — Entry Point
 *
 * The setup() function is called by the plugin loader at startup.
 * Use it for imperative registration or one-time initialization.
 */

export async function setup(context) {
  console.log('[hello-world] Plugin setup complete! Context keys:', Object.keys(context));
}
