import { describe, expect, it, vi } from "vitest";
import { createApi } from "../src/api/client";

describe("REST client", () => {
  it("sends the selected identity and exact integer body", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{"problem_id":"p"}'));
    const client = createApi("/api", fetcher);
    await client.command(
      "/problems/p/investments",
      { id: "investor-a", role: "investor" },
      { amount: 600000, key: "once" },
    );
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("/api/problems/p/investments");
    expect(options.headers["X-User-Id"]).toBe("investor-a");
    expect(options.headers["X-Role"]).toBe("investor");
    expect(JSON.parse(options.body)).toEqual({ amount: 600000, key: "once" });
  });
  it("exposes domain errors and handles non-JSON proxy failures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"error":"Набор закрыт"}', { status: 409 }),
      )
      .mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }));
    const client = createApi("/api", fetcher);
    await expect(client.state({ id: "a", role: "investor" })).rejects.toThrow(
      "Набор закрыт",
    );
    await expect(client.users()).rejects.toThrow("502");
  });
});
