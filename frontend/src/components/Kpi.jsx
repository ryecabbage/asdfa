import { useEffect, useState } from "react";
import anime from "animejs";

export default function Kpi({ label, value, format, hint, tone = "neutral" }) {
  const [shown, setShown] = useState(0);
  const empty = value === null || value === undefined;

  useEffect(() => {
    if (empty) return;
    const counter = { v: 0 };
    const animation = anime({
      targets: counter,
      v: value,
      duration: 1100,
      easing: "easeOutExpo",
      update: () => setShown(counter.v),
    });
    return () => animation.pause();
  }, [value]);

  return (
    <div className="kpi reveal">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${tone}`}>{empty ? "-" : format(shown)}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}