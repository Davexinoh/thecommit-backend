import fetch from 'node-fetch';

const EXA_BASE = 'https://api.exa.ai';

export async function searchExa(query, numResults = 3) {
  if (!process.env.EXA_API_KEY) {
    console.warn('[exa] No API key — falling back to empty results');
    return [];
  }

  try {
    const res = await fetch(`${EXA_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EXA_API_KEY,
      },
      body: JSON.stringify({
        query,
        numResults,
        type: 'neural',
        useAutoprompt: true,
        contents: {
          text: { maxCharacters: 1000 },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[exa] API error ${res.status}: ${body}`);
      return [];
    }

    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title || query,
      url: r.url,
      points: 0,
      author: r.author || '',
      summary: r.text || '',
    }));
  } catch (err) {
    console.error('[exa] searchExa failed:', err.message);
    return [];
  }
}

export async function getBuilderStories(topic) {
  const queries = [
    `${topic} developer builder`,
    `${topic} startup founder`,
    `${topic} open source`,
  ];

  const allResults = await Promise.allSettled(
    queries.map((q) => searchExa(q, 2))
  );

  const seen = new Set();
  const stories = [];

  for (const result of allResults) {
    if (result.status !== 'fulfilled') continue;
    for (const story of result.value) {
      if (!seen.has(story.url) && story.title) {
        seen.add(story.url);
        stories.push(story);
      }
    }
  }

  return stories.slice(0, 5);
}
