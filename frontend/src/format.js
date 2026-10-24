export const tick = { fill: "#a1a1a1", fontSize: 12 };

export const cursorStyle = { fill: "rgba(255,255,255,0.05)" };

export const tooltipStyle = {
  background: "#0a0a0a",
  border: "1px solid #262626",
  borderRadius: 8,
  color: "#ededed",
};

export function mw(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value).toLocaleString("en-GB")} MW`;
}

export function pct(value) {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(1)}%`;
}

export function whole(value) {
  return Math.round(value).toString();
}

export function axisMw(value) {
  return `${value / 1000}k`;
}

export function formatDate(iso) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso) {
  return `${formatDate(iso)}, ${iso.slice(11, 16)} UTC`;
}