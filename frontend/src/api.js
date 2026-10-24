const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export async function getDay(decision) {
  const res = await fetch(`${BASE_URL}/day/?decision=${decision}`);
  if (!res.ok) throw new Error("Could not load the day");
  return res.json();
}

export async function getSummary(time) {
  const res = await fetch(`${BASE_URL}/summary/?time=${time}`);
  if (!res.ok) throw new Error("Could not load the summary");
  return res.json();
}