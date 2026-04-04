import fetch from 'node-fetch';

const HN_ALGOLIA = 'https://hn.algolia.com/api/v1';

export async function searchHN(query, numArticles = 3) {
  const url = `${HN_ALGOLIA}/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${numArticles}&numericFilters=points>10`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN Algolia error: ${res.status}`);

  const data = await res.json();
  return (data.hits || []).map((hit) => ({
    title: hit.title,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    points: hit.points,
    author: hit.author,
    num_comments: hit.num_comments,
    hn_id: hit.objectID,
    created_at: hit.created_at,
  }));
}

export async function getTopBuilderStories() {
  const queries = [
    'indie hacker founder launch',
    'open source developer tool',
    'AI startup product',
    'SaaS build in public',
  ];

  const allStories = await Promise.allSettled(queries.map((q) => searchHN(q, 2)));

  const seen = new Set();
  const stories = [];

  for (const result of allStories) {
    if (result.status !== 'fulfilled') continue;
    for (const story of result.value) {
      if (!seen.has(story.hn_id) && story.title) {
        seen.add(story.hn_id);
        stories.push(story);
      }
    }
  }

  return stories.slice(0, 8);
}
