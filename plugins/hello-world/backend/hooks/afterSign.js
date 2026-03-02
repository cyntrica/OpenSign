/**
 * afterSign hook — Hello World test
 *
 * Logs when a document is signed. This demonstrates the hook system.
 */

export default async function afterSign(payload) {
  console.log('[hello-world] afterSign hook fired:', {
    docId: payload.docId,
    isCompleted: payload.isCompleted,
  });
  return payload;
}
