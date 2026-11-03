import { CommandForm } from "./CommandForm";

export const money = (amount) => new Intl.NumberFormat("ru-RU").format(amount);
const statuses = {
  open: "Открыт набор",
  funded: "Пул набран",
  distributed: "Прибыль распределена",
};

// ProjectCard Render server-filtered project data and commands available to the selected role.
export function ProjectCard({ project, user, execute, busy }) {
  const { id, title, solutions, matched, match, pool } = project;
  const base = `/problems/${id}`;
  const command = { execute, busy };
  return (
    <article className="card" aria-label={title}>
      <h3>{title}</h3>
      <small>Проблема: {id}</small>
      {solutions.map((solution) => (
        <section key={solution.id}>
          <p>{solution.description}</p>
          <small>Технолог: {solution.technologist_id}</small>
          {user.role === "expert" && !matched && (
            <CommandForm
              {...command}
              label="Подтвердить матч"
              path={`${base}/match`}
              extra={{ solution_id: solution.id }}
            />
          )}
        </section>
      ))}
      {user.role === "technologist" && !matched && (
        <CommandForm
          {...command}
          label="Предложить решение"
          path={`${base}/solutions`}
          fields={[
            {
              name: "text",
              label: "Описание технологии",
              value: "Модульная система фильтрации и очистки воды",
            },
          ]}
        />
      )}
      {match && <p>✓ Матч подтверждён экспертом {match.expert_id}</p>}
      {matched && !match && (
        <p className="muted">
          Эксперт выбрал решение другого технолога, приём предложений закрыт.
        </p>
      )}
      {user.role === "region" && matched && !pool && (
        <CommandForm
          {...command}
          label="Создать пул"
          path={`${base}/pool`}
          fields={[
            { name: "amount", label: "Цель", value: 1000000, money: true },
          ]}
        />
      )}
      {pool && (
        <>
          <span className="badge">{statuses[pool.status] || pool.status}</span>
          <p className="numbers">
            {money(pool.total)} / {money(pool.target)}
          </p>
          <progress
            aria-label="Собрано средств"
            max={pool.target}
            value={pool.total}
          />
          {pool.investments?.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Инвестор</th>
                  <th>Вклад</th>
                </tr>
              </thead>
              <tbody>
                {pool.investments.map((investment) => (
                  <tr key={investment.id}>
                    <td>{investment.investor_id}</td>
                    <td>{money(investment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {user.role === "region" && pool.status === "funded" && (
            <CommandForm
              {...command}
              label="Зафиксировать прибыль"
              path={`${base}/profit`}
              fields={[
                {
                  name: "amount",
                  label: "Прибыль",
                  value: 100000,
                  money: true,
                },
              ]}
            />
          )}
          {pool.distribution && (
            <>
              <h3>
                Прибыль {money(pool.distribution.profit)} · начислена
                автоматически
              </h3>
              {(pool.distribution.payouts || []).map((payout) => (
                <p className="numbers" key={payout.investor_id}>
                  {payout.investor_id}: +{money(payout.amount)}
                </p>
              ))}
              {user.role === "region" && (
                <CommandForm
                  {...command}
                  label="Повторить ту же операцию"
                  path={`${base}/profit`}
                  extra={{ amount: pool.distribution.profit }}
                />
              )}
              <small>Распределение: {pool.distribution.id}</small>
            </>
          )}
        </>
      )}
    </article>
  );
}
