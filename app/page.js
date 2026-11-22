"use client";
import { useState } from "react";
import { PROMPT, score } from "./case";

const PROVIDERS = [{ id: "claude", name: "Claude (Anthropic API)" }, { id: "baseten", name: "Baseten (open model)" }];
const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);

export default function Home() {
  const [runs, setRuns] = useState(10);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  async function go() {
    setBusy(true); setRes(null);
    const jobs = PROVIDERS.flatMap(p =>
      Array.from({ length: runs }, () =>
        fetch("/api/run", { method: "POST", body: JSON.stringify({ provider: p.id, prompt: PROMPT }) })
          .then(r => r.json()).then(r => ({ ...r, provider: p.id })).catch(e => ({ ok: false, error: String(e), provider: p.id }))
      )
    );
    const all = await Promise.all(jobs);
    const out = {};
    for (const p of PROVIDERS) {
      const r = all.filter(x => x.provider === p.id);
      const good = r.filter(x => x.ok);
      out[p.id] = {
        accuracy: Math.round((good.reduce((s, x) => s + score(x.text), 0) / r.length) * 100),
        uptime: Math.round((good.length / r.length) * 100),
        ttft: avg(good.map(x => x.ttft).filter(Boolean)),
        total: avg(good.map(x => x.total)),
        note: r.find(x => x.error)?.error || "",
      };
    }
    setRes(out); setBusy(false);
  }

  const best = (k, low) => {
    if (!res) return null;
    const [a, b] = PROVIDERS.map(p => res[p.id][k]);
    if (a == null || b == null || a === b) return null;
    return (low ? a < b : a > b) ? "claude" : "baseten";
  };
  const Row = ({ p, k, label, unit, low }) => (
    <div>{label}: <b>{res[p.id][k] ?? "–"}{unit}</b> {best(k, low) === p.id ? "🏆" : ""}</div>
  );

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22 }}>Earnings Extraction Race</h1>
      <p style={{ fontSize: 14 }}>Both models read the same long earnings-release excerpt (~450 words) and return 5 numbers as JSON. Accuracy = share of the 5 fields correct.</p>
      <label>Runs per model: <input type="number" min={1} max={30} value={runs} onChange={e => setRuns(+e.target.value)} style={{ width: 50 }} /></label>
      <button onClick={go} disabled={busy} style={{ marginLeft: 12, padding: "10px 18px", borderRadius: 8, border: 0, background: "#111", color: "#fff" }}>
        {busy ? "Running…" : "Run both now"}
      </button>
      {res && PROVIDERS.map(p => (
        <section key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 14, marginTop: 14, lineHeight: 1.7 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>{p.name}</h2>
          <Row p={p} k="accuracy" label="🎯 Accuracy" unit="%" />
          <Row p={p} k="ttft" label="⚡ Time to first token" unit=" ms" low />
          <Row p={p} k="total" label="⏱ Total time" unit=" ms" low />
          <Row p={p} k="uptime" label="✅ Uptime" unit="%" />
          {res[p.id].note && <div style={{ fontSize: 12, color: "#b00" }}>Error: {res[p.id].note}</div>}
        </section>
      ))}
    </main>
  );
}
