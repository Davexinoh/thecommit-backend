import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export async function generateDigest(articleBody) {
  const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a news editor creating a 60-second briefing for a busy software engineer.

Given this article, produce exactly 3 bullet points that capture the essentials. Each bullet should be one tight sentence — what happened, why it matters, what's next. No fluff, no hedging.

Article:
${articleBody}

Respond in this exact JSON format:
{
  "bullets": ["...", "...", "..."]
}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    // Fallback: extract bullet-like lines manually
    const lines = raw.split('\n').filter((l) => l.trim().startsWith('-') || l.trim().startsWith('•'));
    return {
      bullets: lines.slice(0, 3).map((l) => l.replace(/^[-•]\s*/, '').trim()),
    };
  }
}

export async function answerQuestion({ articleBody, question }) {
  const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are answering a question about a specific news article. Answer only from the content of the article. If the answer is not in the article, say so honestly — do not speculate or use outside knowledge.

Article:
${articleBody}

Question: ${question}

Give a direct, concise answer in 2–4 sentences. No preamble.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
