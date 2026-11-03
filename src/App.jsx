import { useEffect, useState } from "react";
import { api } from "./api/client";
import { useCabinet } from "./hooks/useCabinet";
import { CommandForm } from "./components/CommandForm";
import { ProjectCard, money } from "./components/ProjectCard";
import { EventLog } from "./components/EventLog";

const help = {
  region:
    "Регион: публикуйте проблемы, создавайте пулы после экспертизы и фиксируйте прибыль.",
  technologist:
    "Технолог: выбирайте опубликованную проблему и предлагайте решение.",
  expert:
    "Эксперт: подтвердите решение для проблемы. Доступны все проекты и журнал событий.",
  investor:
    "Инвестор: выбирайте открытые пулы. Здесь видны только ваши вклады и начисления.",
};

// Cabinet Isolate each selected user's state, in-flight requests and rendered financial data.
function Cabinet({ client, user }) {
  const { state, loading, message, busy, refresh, execute } = useCabinet(
    client,
    user,
  );
  const command = { execute, busy: busy || loading };
  return (
    <>
      <p>{help[user.role]}</p>
      {message && (
        <div
          className={`message ${message.error ? "error" : ""}`}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </div>
      )}
      <button type="button" onClick={refresh} disabled={busy || loading}>
        Обновить
      </button>
      {loading && (
        <p className="busy" role="status">
          Загрузка состояния…
        </p>
      )}
      <main aria-busy={loading || busy}>
        {state && (
          <>
            {user.role === "region" && (
              <section className="card">
                <h2>Новая региональная проблема</h2>
                <CommandForm
                  {...command}
                  label="Опубликовать"
                  path="/problems"
                  fields={[
                    {
                      name: "text",
                      label: "Проблема",
                      value: "Томская область, очистка воды",
                    },
                  ]}
                />
              </section>
            )}
            {user.role === "investor" && (
              <section>
                <h2>Открытые пулы</h2>
                {!state.opportunities.length && (
                  <p>Сейчас нет открытых пулов.</p>
                )}
                {state.opportunities.map((pool) => (
                  <article
                    className="card"
                    key={pool.pool_id}
                    aria-label={`Открытый пул: ${pool.title}`}
                  >
                    <h3>{pool.title}</h3>
                    <p>
                      {money(pool.total)} / {money(pool.target)} · доступно{" "}
                      {money(pool.target - pool.total)}
                    </p>
                    <CommandForm
                      {...command}
                      label="Внести долю"
                      path={`/problems/${pool.problem_id}/investments`}
                      scope={`${user.id}:${pool.pool_id}:invest`}
                      fields={[
                        {
                          name: "amount",
                          label: "Сумма вклада",
                          value: Math.min(
                            user.id === "investor-a" ? 600000 : 400000,
                            pool.target - pool.total,
                          ),
                          money: true,
                        },
                      ]}
                    />
                  </article>
                ))}
              </section>
            )}
            <h2>{user.role === "investor" ? "Мои инвестиции" : "Проекты"}</h2>
            {!state.projects.length && (
              <p>
                Пока нет доступных проектов. Пройдите следующий шаг под нужной
                ролью.
              </p>
            )}
            {state.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                user={user}
                {...command}
              />
            ))}
          </>
        )}
      </main>
      {["region", "expert"].includes(user.role) && (
        <EventLog client={client} user={user} />
      )}
    </>
  );
}

// App Load seeded users and mount a fresh cabinet whenever the selected identity changes.
export default function App({ client = api }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    client
      .users(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setUsers(result);
          setUserId(result[0]?.id || "");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [client, attempt]);
  const user = users.find((item) => item.id === userId);
  return (
    <>
      <header>
        <div>
          <small>РЕГИОН → ТЕХНОЛОГИЯ → ИНВЕСТИЦИИ</small>
          <h1>Инвест-пул</h1>
          <span className="muted">Прозрачный пилот очистки воды</span>
        </div>
        <label>
          Демонстрационный пользователь
          <select
            aria-label="Пользователь"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={!users.length}
          >
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.role}
              </option>
            ))}
          </select>
        </label>
      </header>
      <p className="guide">
        Регион публикует проблему → технолог предлагает решение → эксперт
        подтверждает → регион создаёт пул 1 000 000 → инвесторы A и B вносят 600
        000 и 400 000 → регион фиксирует прибыль 100 000. Начисления 60 000 и 40
        000 появятся автоматически.
      </p>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt(attempt + 1)}>
            Повторить подключение
          </button>
        </div>
      )}
      {!error && !users.length && <p role="status">Загрузка пользователей…</p>}
      {user && <Cabinet key={user.id} client={client} user={user} />}
      <footer>
        Все суммы — целые минорные единицы. Демонстрационная авторизация по
        сидам, без реальных денежных переводов.
      </footer>
    </>
  );
}
