// createApi Build a REST client; the browser normally uses the same-origin /api proxy.
export function createApi(
  base = "/api",
  fetchImpl = (...args) => fetch(...args),
) {
  async function request(path, user, body, signal) {
    const headers = { Accept: "application/json" };
    if (user) {
      headers["X-User-Id"] = user.id;
      headers["X-Role"] = user.role;
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetchImpl(base.replace(/\/$/, "") + path, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `API вернул некорректный ответ (${response.status}). Проверьте доступность Go-сервиса.`,
      );
    }
    if (!response.ok)
      throw new Error(data.error || `Ошибка API: ${response.status}`);
    return data;
  }
  return {
    users: (signal) => request("/users", null, undefined, signal),
    state: (user, signal) => request("/state", user, undefined, signal),
    events: (user, signal) => request("/events", user, undefined, signal),
    command: (path, user, body) => request(path, user, body),
  };
}
export const api = createApi();
