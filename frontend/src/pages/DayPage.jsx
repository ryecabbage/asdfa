import { useEffect, useState } from "react";
import anime from "animejs";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Kpi from "../components/Kpi";
import { getDay, getSummary } from "../api";
import {
  axisMw,
  cursorStyle,
  formatDate,
  formatDateTime,
  mw,
  pct,
  tick,
  tooltipStyle,
  whole,
} from "../format";

export default function DayPage({ decision, setDecision }) {
  const [day, setDay] = useState(null);
  const [month, setMonth] = useState(null);
  const [status, setStatus] = useState("loading");

  async function load() {
    setStatus("loading");
    try {
      const time = decision.slice(11, 16);
      const [dayData, monthData] = await Promise.all([getDay(decision), getSummary(time)]);
      setDay(dayData);
      setMonth(monthData);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  const ready = status === "ready" && day && month;
  const metrics = ready ? day.metrics : null;
  const hasData = ready && metrics.n > 0;
  const biasTone = metrics && metrics.bias > 0 ? "warn" : "cool";

  let rows = [];
  let comparison = [];
  let runUsed = null;
  let gap = null;

  if (hasData) {
    rows = day.slots.map((slot) => ({ ...slot, label: slot.time.slice(11, 16) }));
    runUsed = rows.find((slot) => slot.forecast_published)?.forecast_published;
    comparison = [
      { name: "Average error", day: metrics.mae_pct, month: month.overall.mae_pct },
      { name: "Bias", day: metrics.bias_pct, month: month.overall.bias_pct },
    ];
    if (metrics.mae_pct !== null && month.overall.mae_pct !== null) {
      gap = metrics.mae_pct - month.overall.mae_pct;
    }
  }

  return (
    <>
      <section className="panel form-row">
        <div className="field">
          <label htmlFor="decision">Decision date and time (UTC)</label>
          <input
            id="decision"
            type="datetime-local"
            min="2026-01-01T00:00"
            max="2026-01-31T23:59"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          />
        </div>
        <button className="primary" onClick={load}>
          Show forecast
        </button>
        <p className="note">
          UTC is the same as UK time in January. You buy for the day after your decision, using
          only forecasts published up to the time you choose.
        </p>
      </section>

      {status === "loading" && (
        <div className="status">
          <div className="spinner" />
          Loading
        </div>
      )}

      {status === "error" && (
        <div className="status error">Could not load data. Is the Django server running?</div>
      )}

      {ready && metrics.n === 0 && (
        <div className="status">
          No forecast data for {formatDate(day.date)}. Choose a decision time in January 2026.
        </div>
      )}

      {hasData && (
        <>
          <section className="result reveal">
            <div className="result-head">
              <h2>Delivery day: {formatDate(day.date)}</h2>
              {runUsed && <span className="chip">Forecast used: {formatDateTime(runUsed)}</span>}
            </div>
            <p className="headline">
              The forecast was off by <b>{mw(metrics.mae)}</b> ({pct(metrics.mae_pct)}) on average
              and ran <b className={biasTone}>{metrics.bias > 0 ? "too high" : "too low"}</b> overall.
            </p>
          </section>

          <section className="grid-kpi">
            <Kpi label="Average error (MAE)" value={metrics.mae} format={mw} hint="Typical size of a miss" />
            <Kpi label="Average error %" value={metrics.mae_pct} format={pct} hint="Compared with actual output" />
            <Kpi
              label="Bias"
              value={metrics.bias}
              format={mw}
              tone={biasTone}
              hint={metrics.bias > 0 ? "Forecast too high" : "Forecast too low"}
            />
            <Kpi label="Bias %" value={metrics.bias_pct} format={pct} tone={biasTone} />
            <Kpi label="RMSE" value={metrics.rmse} format={mw} hint="Weights big misses more" />
            <Kpi label="Hours compared" value={metrics.n} format={whole} hint="Forecasts are hourly" />
          </section>

          <section className="card reveal">
            <h3>Forecast vs actual</h3>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={rows}>
                <defs>
                  <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ededed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ededed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="label" interval={3} tick={tick} />
                <YAxis tickFormatter={(v) => `${axisMw(v)} MW`} tick={tick} width={72} />
                <Tooltip cursor={cursorStyle} contentStyle={tooltipStyle} formatter={(v) => mw(v)} />
                <Legend />
                <Area dataKey="actual" name="Actual" stroke="#ededed" strokeWidth={2} fill="url(#actualFill)" />
                <Line dataKey="forecast" name="Forecast" stroke="#3291ff" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          <section className="two-col">
            <div className="card reveal">
              <h3>Error by hour</h3>
              <p className="caption">Red means the forecast was too high, blue too low.</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rows}>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="label" interval={5} tick={tick} />
                  <YAxis tickFormatter={axisMw} tick={tick} width={48} />
                  <Tooltip cursor={cursorStyle} contentStyle={tooltipStyle} formatter={(v) => mw(v)} />
                  <Bar dataKey="error" name="Error">
                    {rows.map((row, i) => (
                      <Cell key={i} fill={row.error > 0 ? "#ff5c5c" : "#3291ff"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card reveal">
              <h3>This day vs January average</h3>
              <p className="caption">
                {gap === null
                  ? "Same decision time of day, every day in January."
                  : `This day was ${Math.abs(gap).toFixed(1)} percentage points ${
                      gap > 0 ? "worse" : "better"
                    } than the January average.`}
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparison}>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="name" tick={tick} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={tick} width={48} />
                  <Tooltip cursor={cursorStyle} contentStyle={tooltipStyle} formatter={(v) => pct(v)} />
                  <Legend />
                  <Bar dataKey="day" name="This day" fill="#3291ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="month" name="January average" fill="#ededed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </>
  );
}