import Groq from 'groq-sdk';

let groqClient = null;

function getClient() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export async function generateArticle({ topic, sources }) {
  const client = getClient();

  const sourceSummary = sources
    .map((s, i) => `[${i + 1}] "${s.title}" — ${s.url} (${s.points} points on HN)`)
    .join('\n');

  const prompt = `You are a senior technology journalist writing for a publication read by software engineers, indie founders, and builders. Your writing is clear, informed, and never hype-driven. You cite sources honestly and surface what actually matters to people who ship software.

Write a full news article about the following topic: "${topic}"

Use these Hacker News stories as your primary source material:
${sourceSummary}

REQUIREMENTS:
- Headline: Sharp, specific, not clickbait. No colons unless truly necessary.
- Subheadline: One sentence that adds context the headline can't.
- Body: 550–650 words. 4–6 paragraphs. Opening paragraph establishes the core news in two sentences. Middle paragraphs add context, technical detail, and why this matters to builders. Closing paragraph gives a forward-looking take — what this means for the ecosystem.
- Tone: Informed, direct, no adjective inflation. Treat the reader as a smart peer.
- Do NOT fabricate quotes. Do NOT invent statistics not in source material.
- End with a "Sources" section listing the HN links used.

Respond in this exact JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "body": "...",
  "category": "one of: Tools, Funding, Open Source, AI, Community, SaaS",
  "read_time_minutes": <integer>
}`;

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Groq returned empty response');

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Groq response was not valid JSON: ${raw.slice(0, 200)}`);
  }
}
