"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({ level: "error", msg: "app_error", err: error.message }));
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-slate-600">
        Rechargez la page ou réessayez dans un instant.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Réessayer
      </button>
    </div>
  );
}
