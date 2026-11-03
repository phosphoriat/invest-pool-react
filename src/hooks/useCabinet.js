import { useCallback, useEffect, useRef, useState } from "react";

// useCabinet Load role-scoped data and discard stale requests after refresh or unmount.
export function useCabinet(client, user) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(null);
  const mounted = useRef(true);
  const submitting = useRef(false);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const result = await client.state(user, controller.signal);
      if (!controller.signal.aborted && mounted.current) setState(result);
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) {
        setState(null);
        setMessage({ error: true, text: error.message });
      }
    } finally {
      if (!controller.signal.aborted && mounted.current) setLoading(false);
    }
  }, [client, user]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, [refresh]);

  // execute Capture the actor for this command and allow only one submission at a time.
  async function execute(path, body, accepted) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await client.command(path, user, body);
      accepted?.();
      if (mounted.current) {
        setMessage({ error: false, text: "Операция сохранена" });
        await refresh();
      }
    } catch (error) {
      if (mounted.current) setMessage({ error: true, text: error.message });
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return { state, loading, message, busy, refresh, execute };
}
