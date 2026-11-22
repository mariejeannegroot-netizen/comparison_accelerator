export const maxDuration = 60;

export async function POST(req) {
  const { provider, prompt } = await req.json();
  const t0 = Date.now();
  let ttft = null, text = "";
  try {
    const isClaude = provider === "claude";
    const url = isClaude ? "https://api.anthropic.com/v1/messages" : "https://inference.baseten.co/v1/chat/completions";
    const headers = isClaude
      ? { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }
      : { "content-type": "application/json", Authorization: `Api-Key ${process.env.BASETEN_API_KEY}` };
    const body = isClaude
      ? { model: process.env.CLAUDE_MODEL || "claude-haiku-5-5", max_tokens: 400, stream: true, messages: [{ role: "user", content: prompt }] }
      : { model: process.env.BASETEN_MODEL || "openai/gpt-oss-120b", max_tokens: 2000, stream: true, messages: [{ role: "user", content: prompt }] };

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const d = l.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        let j; try { j = JSON.parse(d); } catch { continue; }
        const delta = j.choices?.[0]?.delta;
        const piece = isClaude ? (j.type === "content_block_delta" ? j.delta?.text || "" : "") : (delta?.content || "");
        const any = piece || delta?.reasoning_content || delta?.reasoning;
        if (any && ttft === null) ttft = Date.now() - t0;
        text += piece;
      }
    }
    return Response.json({ ok: true, ttft, total: Date.now() - t0, text });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e), total: Date.now() - t0 });
  }
}
