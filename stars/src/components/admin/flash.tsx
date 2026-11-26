export function Flash({ ok, error }: { ok?: string; error?: string }) {
  return (
    <>
      {ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    </>
  );
}
