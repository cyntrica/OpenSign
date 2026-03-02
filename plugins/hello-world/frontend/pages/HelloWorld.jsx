/**
 * Hello World Plugin Page
 *
 * A minimal React page that demonstrates the frontend plugin system.
 * Accessible at /hello when logged in.
 */

import { useState } from "react";

export default function HelloWorld() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handlePing() {
    setLoading(true);
    try {
      const res = await Parse.Cloud.run("hello_ping");
      setResult(res);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Hello Plugin</h1>
      <p className="mb-4 text-base-content/70">
        This page was injected by the <code>hello-world</code> plugin.
        It demonstrates that the plugin system's frontend routing and menu
        injection are working correctly.
      </p>

      <button
        className="op-btn op-btn-primary"
        onClick={handlePing}
        disabled={loading}
      >
        {loading ? "Pinging..." : "Test Backend (hello_ping)"}
      </button>

      {result && (
        <pre className="mt-4 p-4 bg-base-300 rounded-lg text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
