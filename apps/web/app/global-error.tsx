"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(JSON.stringify({ level: "error", msg: "global_error", err: error.message }));

  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center font-sans">
        <h1 className="text-xl font-semibold text-slate-900">Une erreur est survenue</h1>
        <p className="max-w-md text-sm text-slate-600">
          Rechargez la page ou réessayez dans un instant.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
