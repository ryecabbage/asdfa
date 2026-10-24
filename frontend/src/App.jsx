import { useEffect, useState } from "react";
import anime from "animejs";
import DayPage from "./pages/DayPage";
import SummaryPage from "./pages/SummaryPage";

const TABS = [
  { id: "day", label: "Day forecast" },
  { id: "summary", label: "January summary" },
];

const SUBTITLES = {
  day: "Pick a decision time to see the forecast you would have had, and how far off it was.",
  summary: "See how accurate the forecasts were on every day in January 2026.",
};

function Blades() {
  return (
    <>
      <path d="M-5 0 L0 -74 L5 0 Z" />
      <path d="M-5 0 L0 -74 L5 0 Z" transform="rotate(120)" />
      <path d="M-5 0 L0 -74 L5 0 Z" transform="rotate(240)" />
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState("day");
  const [decision, setDecision] = useState("2026-01-14T07:30");

  useEffect(() => {
    anime({
      targets: ".rotor",
      rotate: "1turn",
      duration: 9000,
      easing: "linear",
      loop: true,
    });
    anime({
      targets: ".hero-text > *, .hero-points > *",
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(110),
      duration: 900,
      easing: "easeOutExpo",
    });
    anime({
      targets: ".hero-art",
      opacity: [0, 1],
      duration: 1400,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <>
      <header className="topbar">
        <svg className="logo" viewBox="-12 -12 24 24" width="22" height="22">
          <g transform="scale(0.16)">
            <Blades />
          </g>
        </svg>
        <nav className="nav">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <span className="tag">Data: Elexon BMRS</span>
      </header>

      <main className="container">
        <section className="hero">
          <div className="hero-text">
            <h1>Wind Forecast</h1>
            <p>{SUBTITLES[tab]}</p>
          </div>

          <div className="hero-art" aria-hidden="true">
            <svg className="tower" viewBox="0 0 220 260" width="220" height="260">
              <path d="M110 90 L105 258 L115 258 Z" />
            </svg>
            <svg className="rotor" viewBox="-80 -80 160 160" width="160" height="160">
              <Blades />
              <circle r="7" />
            </svg>
          </div>
        </section>

        {tab === "day" ? (
          <DayPage decision={decision} setDecision={setDecision} />
        ) : (
          <SummaryPage initialTime={decision.slice(11, 16)} />
        )}
      </main>

      <footer className="footer">
        <span>Created by Aranyak Dutta</span>
        <span className="dot" />
        <span>Data: Elexon BMRS</span>
      </footer>
    </>
  );
}