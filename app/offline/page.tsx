/**
 * app/offline/page.tsx
 * Shown by the service worker when the user is offline and no cache exists.
 */
export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <span className="text-7xl mb-6" role="img" aria-label="No connection">📶</span>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re offline</h1>
      <p className="text-gray-500 max-w-xs mb-8">
        Sertch needs a connection to fetch live prices. Reconnect and the app will sync automatically.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn-primary"
      >
        Retry
      </button>
    </main>
  );
}
