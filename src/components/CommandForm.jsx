import { useState } from "react";

export const MAX_MONEY = 9_000_000_000_000_000;

// pendingKey Preserve a financial operation key across reloads until the server confirms it.
function pendingKey(scope) {
  const name = `invest-pool:operation:${scope}`;
  try {
    const saved = sessionStorage.getItem(name);
    if (saved) return saved;
  } catch {
    /* Storage may be disabled; retain the key in component state instead. */
  }
  const value = crypto.randomUUID();
  try {
    sessionStorage.setItem(name, value);
  } catch {
    /* Optional persistence. */
  }
  return value;
}

// CommandForm Render a typed command; allocation itself always belongs to the Go service.
export function CommandForm({
  label,
  fields = [],
  path,
  extra = {},
  execute,
  busy,
  scope,
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      fields.map((field) => [field.name, String(field.value ?? "")]),
    ),
  );
  const [operationKey, setOperationKey] = useState(() =>
    scope ? pendingKey(scope) : "",
  );
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const body = { ...extra };
    for (const field of fields) {
      const value = values[field.name];
      body[field.name] = field.money ? Number(value) : value.trim();
      if (
        field.money &&
        (!/^\d+$/.test(value) ||
          !Number.isSafeInteger(body[field.name]) ||
          body[field.name] <= 0 ||
          body[field.name] > MAX_MONEY)
      ) {
        setError("Нужна положительная целая сумма в допустимом диапазоне");
        return;
      }
    }
    if (scope) body.key = operationKey.trim();
    await execute(
      path,
      body,
      scope
        ? () => {
            try {
              sessionStorage.removeItem(`invest-pool:operation:${scope}`);
            } catch {
              /* Optional persistence. */
            }
            setOperationKey(pendingKey(scope));
          }
        : undefined,
    );
  }

  return (
    <>
      <form onSubmit={submit} aria-label={label}>
        <fieldset disabled={busy}>
          {fields.map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                name={field.name}
                value={values[field.name]}
                required
                type={field.money ? "number" : "text"}
                min={field.money ? "1" : undefined}
                max={field.money ? String(MAX_MONEY) : undefined}
                step={field.money ? "1" : undefined}
                maxLength={field.money ? undefined : 1000}
                onChange={(event) =>
                  setValues({ ...values, [field.name]: event.target.value })
                }
              />
            </label>
          ))}
          {scope && (
            <label>
              Ключ операции
              <input
                name="key"
                required
                maxLength={128}
                value={operationKey}
                onChange={(event) => {
                  setOperationKey(event.target.value);
                  try {
                    sessionStorage.setItem(
                      `invest-pool:operation:${scope}`,
                      event.target.value,
                    );
                  } catch {
                    /* Optional persistence. */
                  }
                }}
              />
            </label>
          )}
          <button type="submit">{label}</button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
