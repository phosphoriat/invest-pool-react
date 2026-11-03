import { useEffect, useState } from "react";

// EventLog Fetch the audit only while an authorized user's journal is open.
export function EventLog({ client, user }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    client
      .events(user, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setEvents(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [client, user, open, revision]);
  return (
    <section className="card">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Журнал событий
      </button>
      {open && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRevision(revision + 1)}
          >
            Обновить журнал
          </button>
          {loading && <p>Загрузка событий…</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && !events.length && (
            <p>Событий пока нет. Доставка может занять секунду.</p>
          )}
          {events.map((event) => (
            <details key={event.id}>
              <summary>
                {event.name} · {event.occurred_at}
              </summary>
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </details>
          ))}
        </>
      )}
    </section>
  );
}
