import { afterAll, beforeAll, expect, it } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { once } from "node:events";
import App from "../src/App";
import { createApi } from "../src/api/client";

let backend, proxy, directory;
const backendURL = "http://127.0.0.1:18089";
const proxyURL = "http://127.0.0.1:18090";

// ready Wait for a spawned service to answer without replacing it with a mock.
async function ready(url, child) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null)
      throw new Error(`Service exited: ${child.exitCode}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* Startup is asynchronous. */
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`Service did not start: ${url}`);
}

// stop Shut down only processes owned by this test.
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await exited;
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "invest-pool-react-"));
  const binary = resolve(
    process.env.GO_BACKEND_BINARY || "../invest-pool-go/bin/invest-pool",
  );
  backend = spawn(binary, [], {
    env: {
      ...process.env,
      HTTP_ADDR: "127.0.0.1:18089",
      DATABASE_PATH: join(directory, "test.db"),
    },
    stdio: "inherit",
  });
  await ready(`${backendURL}/health`, backend);
  proxy = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "18090"],
    {
      env: { ...process.env, API_TARGET: backendURL },
      stdio: "inherit",
    },
  );
  await ready(`${proxyURL}/api/users`, proxy);
}, 30000);

afterAll(async () => {
  await stop(proxy);
  await stop(backend);
  if (directory) await rm(directory, { recursive: true, force: true });
});

it("completes the React cabinet scenario through Vite proxy and the Go REST API", async () => {
  const client = createApi(`${proxyURL}/api`);
  const user = userEvent.setup();
  render(<App client={client} />);
  async function select(id) {
    await user.selectOptions(screen.getByLabelText("Пользователь"), id);
  }
  async function command(label) {
    await user.click(
      await screen.findByRole("button", { name: label, exact: true }),
    );
  }
  await command("Опубликовать");
  await screen.findByRole("article", { name: "Томская область, очистка воды" });
  await select("tech-water");
  await command("Предложить решение");
  await screen.findByText("Модульная система фильтрации и очистки воды");
  await select("expert-1");
  await command("Подтвердить матч");
  await screen.findByText(/Матч подтверждён экспертом/);
  await select("region-tomsk");
  await command("Создать пул");
  await screen.findByText("Открыт набор");
  await select("investor-a");
  await command("Внести долю");
  expect(
    screen.queryByRole("button", { name: "Опубликовать" }),
  ).not.toBeInTheDocument();
  await screen.findByRole("article", { name: "Томская область, очистка воды" });
  await select("investor-b");
  await command("Внести долю");
  await screen.findByText("Пул набран");
  await select("region-tomsk");
  await command("Зафиксировать прибыль");
  await screen.findByText(/investor-a: \+60\s000/);
  expect(screen.getByText(/investor-b: \+40\s000/)).toBeInTheDocument();
  await command("Повторить ту же операцию");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Повторить ту же операцию" }),
    ).toBeEnabled(),
  );
  await select("investor-a");
  await screen.findByText(/investor-a: \+60\s000/);
  expect(
    within(screen.getByRole("main")).queryByText(/investor-b/),
  ).not.toBeInTheDocument();
  await select("investor-b");
  await screen.findByText(/investor-b: \+40\s000/);
  await select("region-other");
  await screen.findByRole("button", { name: "Опубликовать" });
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  await select("expert-1");
  await command("Журнал событий");
  await screen.findByText(/ProfitDistributed ·/);
});
