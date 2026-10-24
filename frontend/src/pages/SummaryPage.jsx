import { useEffect, useState } from "react";
import anime from "animejs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Kpi from "../components/Kpi";
import { getSummary } from "../api";
import { axisMw, cursorStyle, formatDate, mw, pct, tick, tooltipStyle } from "../format";

const RUN_TIMES = ["02:30", "04:30", "07:30", "09:30", "11:30", "15:30", "18:30", "22:30"];

export default function SummaryPage({ initialTime }) {
  const [time, setTime] = useState(initialTime);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("loading");
  const [unit, setUnit] = useState("pct");
  const [byRun, setByRun] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    if (!time) return;
    let active = true;
    setStatus("loading");
    getSummary(time)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [time]);

  useEffect(() => {
    if (status !== "ready") return;
    anime({
      targets: ".reveal",
      translateY: [24, 0],
      opacity: [0, 1],
      delay: anime.stagger(80),
      duration: 700,
      easing: "easeOutExpo",
    });
  }, [status]);

  async function compareRuns() {
    setComparing(true);
    try {
      const results = await Promise.all(RUN_TIMES.map((t) => getSummary(t)));
      setByRun(results.map((r, i) => ({ time: RUN_TIMES[i], mae_pct: r.overall.mae_pct })));
    } catch (err) {
      setByRun(null);
    }
    setComparing(false);
  }

  const ready = status === "ready" && summary;
  const validDays = ready ? summary.days.filter((d) => d.n > 0) : [];
  const hasData = validDays.length > 0;

  let bestDay = null;
  let worstDay = null;
  let days = [];
  if (hasData) {
    bestDay = validDays.reduce((a, b) => (b.mae_pct < a.mae_pct ? b : a));
    worstDay = validDays.reduce((a, b) => (b.mae_pct > a.mae_pct ? b : a));
    days = summary.days.map((d) => ({ ...d, label: formatDate(d.date) }));
  }

  let bestRun = null;
  let firstRun = null;
  let lastRun = null;
  let change = null;
  if (byRun) {
    firstRun = byRun[0];
    lastRun = byRun[byRun.length - 1];
    bestRun = byRun.reduce((a, b) => (b.mae_pct < a.mae_pct ? b : a));
    change = firstRun.mae_pct - lastRun.mae_pct;
  }

  const barKey = unit === "pct" ? "mae_pct" : "mae";
  const lineKey = unit === "pct" ? "bias_pct" : "bias";
  const formatValue = unit === "pct" ? pct : mw;
  const biasTone = summary && summary.overall.bias > 0 ? "warn" : "cool";

  return (
    <>
      <section className="panel">
        <div className="field">
          <label htmlFor="time">Decision time of day (UTC), applied to every day in January</label>
          <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="chips">
          {RUN_TIMES.map((t) => (
            <button key={t} className={time === t ? "chip active" : "chip"} onClick={() => setTime(t)}>
              {t}
            </button>
          ))}
        </div>
        <p className="note">
          These are the times Elexon publishes a new forecast. If you decide just after one, you
          see that run.
        </p>
      </section>

      {status === "loading" && (
        <div className="status">
          <div className="spinner" />
          Loading January
        </div>
      )}

      {status === "error" && (
        <div className="status error">Could not load data. Is the Django server running?</div>
      )}

      {ready && !hasData && (
        <div className="status">No forecast data for this decision time. Try 09:00.</div>
      )}

      {hasData && (
        <>
          <section className="result reveal">
            <h2>Deciding at {time} UTC, every day in January</h2>
            <p className="headline">
              Forecasts were off by <b>{mw(summary.overall.mae)}</b> ({pct(summary.overall.mae_pct)}) on
              average and ran <b className={biasTone}>{summary.overall.bias > 0 ? "too high" : "too low"}</b>{" "}
              by {mw(Math.abs(summary.overall.bias))} overall.
            </p>
          </section>

          <section className="grid-kpi">
            <Kpi label="January MAE" value={summary.overall.mae} format={mw} />
            <Kpi label="January MAE %" value={summary.overall.mae_pct} format={pct} />
            <Kpi
              label="January bias"
              value={summary.overall.bias}
              format={mw}
              tone={biasTone}
              hint={summary.overall.bias > 0 ? "Forecasts run high" : "Forecasts run low"}
            />
            <Kpi label="January RMSE" value={summary.overall.rmse} format={mw} />
            <Kpi
              label="Most accurate day"
              value={bestDay.mae_pct}
              format={pct}
              tone="good"
              hint={`Delivery ${formatDate(bestDay.date)}`}
            />
            <Kpi
              label="Least accurate day"
              value={worstDay.mae_pct}
              format={pct}
              tone="warn"
              hint={`Delivery ${formatDate(worstDay.date)}`}
            />
          </section>

          <section className="card reveal">
            <div className="card-head">
              <h3>Error by delivery day</h3>
              <div className="toggle">
                <button className={unit === "pct" ? "active" : ""} onClick={() => setUnit("pct")}>
                  %
                </button>
                <button className={unit === "mw" ? "active" : ""} onClick={() => setUnit("mw")}>
                  MW
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={days}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="label" interval={2} tick={tick} />
                <YAxis
                  tickFormatter={(v) => (unit === "pct" ? `${v}%` : axisMw(v))}
                  tick={tick}
                  width={56}
                />
                <Tooltip cursor={cursorStyle} contentStyle={tooltipStyle} formatter={(v) => formatValue(v)} />
                <Legend />
                <ReferenceLine y={0} stroke="#404040" />
                <Bar dataKey={barKey} name="Average error" fill="#ff5c5c" radius={[4, 4, 0, 0]} />
                <Line dataKey={lineKey} name="Bias" stroke="#3291ff" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          <section className="card reveal">
            <div className="card-head">
              <div>
                <h3>Does deciding later help?</h3>
                <p className="caption">January average error for each forecast run you could decide on.</p>
              </div>
              <button className="primary small" onClick={compareRuns} disabled={comparing}>
                {comparing ? "Comparing..." : "Compare all forecast runs"}
              </button>
            </div>

            {byRun ? (
              <>
                <p className="headline small">
                  January error is lowest at <b>{bestRun.time} UTC</b> ({pct(bestRun.mae_pct)}). Deciding
                  at {lastRun.time} instead of {firstRun.time} {change > 0 ? "cuts" : "adds"}{" "}
                  {Math.abs(change).toFixed(1)} percentage points of error.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byRun} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="time" tick={tick} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => `${v}%`}
                      tick={tick}
                      width={44}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={cursorStyle}
                      contentStyle={tooltipStyle}
                      formatter={(v) => [pct(v), "January average error"]}
                    />
                    <Bar dataKey="mae_pct" barSize={34} radius={[6, 6, 0, 0]}>
                      {byRun.map((row) => (
                        <Cell key={row.time} fill={row.time === bestRun.time ? "#3291ff" : "#3a3a3a"} />
                      ))}
                      <LabelList
                        dataKey="mae_pct"
                        position="top"
                        formatter={(v) => `${v.toFixed(1)}%`}
                        fill="#ededed"
                        fontSize={12}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="caption">
                Runs the January check once for each forecast run, so you can see how accuracy
                changes as the decision moves closer to delivery.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}