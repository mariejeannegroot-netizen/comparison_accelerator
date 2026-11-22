"use client";
import { useState } from "react";

const PROVIDERS = [{ id: "claude", name: "Claude (Anthropic API)" }, { id: "baseten", name: "Kimi K3 (Baseten)" }];
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r0 = x => (x == null ? null : Math.round(x));

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [terms, setTerms] = useState("");
  const [runs, setRuns] = useState(3);
  const [price, setPrice] = useState({ claude: [3, 15], baseten: [3, 15] });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  async function go() {
    setBusy(true); setRes(null);
    const keys = terms.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    const jobs = PROVIDERS.flatMap(p =>
      Array.from({ length: runs }, () =>
        fetch("/api/run", { method: "POST", body: JSON.stringify({ provider: p.id, prompt }) })
          .then(r => r.json()).then(r => ({ ...r, provider: p.id })).catch(e => ({ ok: false, error: String(e), provider: p.id }))
      )
    );
    const all = await Promise.all(jobs);
    const out = {};
    for (const p of PROVIDERS) {
      const r = all.filter(x => x.provider === p.id);
      const good = r.filter(x => x.ok);
      const [pi, po] = price[p.id];
      const hit = x => keys.filter(k => x.text.toLowerCase().includes(k)).length / keys.length;
      out[p.id] = {
        accuracy: keys.length && good.length ? r0((good.reduce((s, x) => s + hit(x), 0) / r.length) * 100) : null,
        ttft: r0(avg(good.map(x => x.ttft).filter(Boolean))),
        ttfa: r0(avg(good.map(x => x.ttfa).filter(Boolean))),
        total: r0(avg(good.map(x => x.total))),
        uptime: r0((good.length / r.length) * 100),
        tokens: good.length ? `${r0(avg(good.map(x => x.inTok)))} in / ${r0(avg(good.map(x => x.outTok)))} out` : null,
        cost: good.length && pi !== "" && po !== "" ? avg(good.map(x => (x.inTok * pi + x.outTok * po) / 1e6)) : null,
        answer: good[0]?.text || "",
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
  const Row = ({ p, k, label, unit = "", low, fmt }) => {
    const v = res[p.id][k];
    return <div>{label}: <b>{v == null ? "–" : fmt ? fmt(v) : v + unit}</b> {best(k, low) === p.id ? "🏆" : ""}</div>;
  };
  const box = { width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 8, border: "1px solid #ccc", fontFamily: "inherit" };
  const pin = (id, i) => <input style={{ width: 45 }} value={price[id][i]} onChange={e => { const v = [...price[id]]; v[i] = e.target.value; setPrice({ ...price, [id]: v }); }} />;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22 }}>Financial Model Race</h1>
      <p style={{ fontSize: 14 }}>Same prompt, both models, same moment. Compares accuracy, speed, uptime and cost.</p>
      <textarea rows={9} style={box} placeholder="Paste your financial prompt here…" value={prompt} onChange={e => setPrompt(e.target.value)} />
      <input style={{ ...box, marginTop: 8 }} placeholder="Answer-key terms for accuracy, comma separated (e.g. 2.35, 2.81, 3.63, 120, 15)" value={terms} onChange={e => setTerms(e.target.value)} />
      <div style={{ fontSize: 13, margin: "8px 0" }}>
        $ per 1M tokens (in / out) — Claude: {pin("claude", 0)} / {pin("claude", 1)} {" "}Kimi: {pin("baseten", 0)} / {pin("baseten", 1)}
      </div>
      <label>Runs per model: <input type="number" min={1} max={20} value={runs} onChange={e => setRuns(+e.target.value)} style={{ width: 50 }} /></label>
      <button onClick={go} disabled={busy || !prompt.trim()} style={{ marginLeft: 12, padding: "10px 18px", borderRadius: 8, border: 0, background: "#111", color: "#fff" }}>
        {busy ? "Running…" : "Run both now"}
      </button>
      {res && PROVIDERS.map(p => (
        <section key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 14, marginTop: 14, lineHeight: 1.7 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>{p.name}</h2>
          <Row p={p} k="accuracy" label="🎯 Accuracy (key terms found)" unit="%" />
          <Row p={p} k="ttft" label="⚡ Time to first token" unit=" ms" low />
          <Row p={p} k="ttfa" label="💬 Time to first answer token" unit=" ms" low />
          <Row p={p} k="total" label="⏱ Total time" unit=" ms" low />
          <Row p={p} k="uptime" label="✅ Uptime" unit="%" />
          <Row p={p} k="cost" label="💲 Cost per answer" low fmt={v => "$" + v.toFixed(5)} />
          <div style={{ fontSize: 13, color: "#555" }}>Tokens: {res[p.id].tokens ?? "–"}</div>
          {res[p.id].note && <div style={{ fontSize: 12, color: "#b00" }}>Error: {res[p.id].note}</div>}
          {res[p.id].answer && <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#f3f4f6", padding: 10, borderRadius: 8 }}>{res[p.id].answer}</pre>}
        </section>
      ))}
    </main>
  );
}
