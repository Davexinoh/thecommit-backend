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

  const prompt = `You are a senior technology journalist. Write a news article as a single valid JSON object. Do not include any text outside the JSON.

Topic: "${topic}"

Source material from Hacker News:
${sourceSummary}

Rules:
- headline: sharp, specific, no clickbait
- subheadline: one sentence of additional context
- body: 4 paragraphs separated by \\n\\n. Each paragraph is 2-3 sentences. Total 400-500 words. No fabricated quotes or statistics. Include sources at the end as a plain text list.
- category: exactly one of: Tools, Funding, Open Source, AI, Community, SaaS
- read_time_minutes: integer between 2 and 5

Respond with only this JSON, no markdown, no explanation:
{"headline":"...","subheadline":"...","body":"...","category":"...","read_time_minutes":3}`;

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
