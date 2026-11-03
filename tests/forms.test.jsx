import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { CommandForm } from "../src/components/CommandForm";
import App from "../src/App";

it("reuses a financial key after a failed request and remount", async () => {
  const execute = vi.fn().mockResolvedValue(undefined);
  const props = {
    label: "Внести долю",
    path: "/problems/p/investments",
    scope: "a:p:invest",
    execute,
    fields: [{ name: "amount", label: "Сумма", value: 600000, money: true }],
  };
  const first = render(<CommandForm {...props} />);
  const key = screen.getByLabelText("Ключ операции").value;
  await userEvent.click(screen.getByRole("button", { name: "Внести долю" }));
  expect(execute.mock.calls[0][1]).toEqual({ amount: 600000, key });
  first.unmount();
  render(<CommandForm {...props} />);
  expect(screen.getByLabelText("Ключ операции")).toHaveValue(key);
  fireEvent.change(screen.getByLabelText("Сумма"), {
    target: { value: "1.5" },
  });
  fireEvent.submit(screen.getByRole("form"));
  expect(screen.getByRole("alert")).toHaveTextContent("целая сумма");
  expect(execute).toHaveBeenCalledTimes(1);
});

it("does not render stale regional data after switching to an investor", async () => {
  let resolveRegion;
  const users = [
    { id: "r", role: "region", name: "Регион" },
    { id: "a", role: "investor", name: "A" },
  ];
  const client = {
    users: vi.fn().mockResolvedValue(users),
    state: vi.fn((user) =>
      user.role === "region"
        ? new Promise((resolve) => {
            resolveRegion = resolve;
          })
        : Promise.resolve({ projects: [], opportunities: [] }),
    ),
    events: vi.fn().mockResolvedValue([]),
  };
  render(<App client={client} />);
  await waitFor(() => expect(client.state).toHaveBeenCalled());
  await userEvent.selectOptions(screen.getByLabelText("Пользователь"), "a");
  await screen.findByRole("heading", { name: "Мои инвестиции" });
  resolveRegion({
    projects: [{ id: "secret", title: "Чужая проблема", solutions: [] }],
    opportunities: [],
  });
  await waitFor(() =>
    expect(screen.queryByText("Чужая проблема")).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("button", { name: "Опубликовать" }),
  ).not.toBeInTheDocument();
});
