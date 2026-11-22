export const DOCUMENT = `HARBOR RIDGE PAYMENTS, INC. - Q3 FY2026 EARNINGS RELEASE (EXCERPT)

Management's Discussion. Total net revenue for the third quarter was $412.6 million, compared with $371.4 million in the third quarter of the prior year. Processing volume reached $38.2 billion. Revenue from the Merchant Services segment was $268.0 million, while the Consumer Lending segment contributed $144.6 million.

Operating expenses included a one-time legal settlement charge of $22.5 million related to a 2023 data-privacy matter. Excluding this charge and stock-based compensation of $31.7 million, adjusted EBITDA was $118.9 million, versus adjusted EBITDA of $104.3 million in the prior-year quarter. GAAP net income was $41.2 million, or $0.37 per diluted share.

Credit quality. The net loss rate on the Consumer Lending portfolio was 2.3% of average receivables in the quarter, up from 1.9% a year ago and down from 2.6% in the second quarter. The allowance for credit losses stands at $96.4 million. Delinquencies over 30 days were 3.8% of receivables.

Capital and liquidity. The company ended the quarter with $710 million in cash and equivalents and $1.1 billion of total debt. During the quarter it repurchased 2.4 million shares for $58.0 million under its existing authorization.

Outlook. Reflecting slower than expected card-present volume in the Merchant Services segment and tighter underwriting in Consumer Lending, the company now expects full-year fiscal 2026 net revenue of $1,610 million to $1,650 million. This compares with the previous range of $1,650 million to $1,700 million provided in August. The company continues to expect full-year adjusted EBITDA margin of approximately 28%.

Risk factors updated this quarter. Management highlighted (1) elevated interchange fee litigation exposure, (2) dependence on two sponsor banks that together process 61% of volume, and (3) rising consumer delinquencies in the lower-credit-tier cohort.`;

export const PROMPT = `You are a financial analyst assistant. Read the earnings excerpt below and return ONLY a JSON object (no explanation, no markdown) with exactly these keys:
- "q3_revenue_musd": number, total net revenue for the quarter in $ millions
- "adjusted_ebitda_musd": number, adjusted EBITDA for the current quarter in $ millions
- "net_loss_rate_pct": number, current-quarter net loss rate on Consumer Lending
- "fy_guidance_midpoint_musd": number, midpoint of the NEW full-year revenue guidance range
- "guidance_direction": one of "raised", "lowered", "maintained"

EXCERPT:
${DOCUMENT}`;

export const ANSWERS = {
  q3_revenue_musd: 412.6,
  adjusted_ebitda_musd: 118.9,
  net_loss_rate_pct: 2.3,
  fy_guidance_midpoint_musd: 1630,
  guidance_direction: "lowered",
};

export function score(text) {
  try {
    const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    let right = 0;
    for (const [k, v] of Object.entries(ANSWERS)) {
      if (typeof v === "number") { if (Math.abs(Number(j[k]) - v) <= Math.abs(v) * 0.005) right++; }
      else if (String(j[k]).toLowerCase().trim() === v) right++;
    }
    return right / Object.keys(ANSWERS).length;
  } catch { return 0; }
}
