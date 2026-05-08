/**
 * Form error per design.md: "inline below the input, mono 11px uppercase
 * vermilion, prefixed `— ERR ·`."
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion">
      — ERR · {message}
    </p>
  );
}

/**
 * Form-level error card — 1px vermilion border, vermilion text title,
 * paper-2 body. Used for server-side errors above a form.
 */
export function FormErrorCard({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="border border-vermilion px-4 py-3 mb-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion font-bold">
        — ERR · {title}
      </p>
      {body ? (
        <p className="mt-1 font-body text-[13px] text-paper-2">{body}</p>
      ) : null}
    </div>
  );
}
