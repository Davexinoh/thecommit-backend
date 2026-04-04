import fetch from 'node-fetch';

const VIRLO_BASE = 'https://api.virlo.ai/v1';

const BUILDER_HASHTAGS = [
  'buildinpublic',
  'indiedev',
  'saas',
  'solofounder',
  'indiehacker',
  'devtools',
  'startups',
  'opensource',
];

// Seed fallback for when Virlo key is not yet active
const SEED_TOPICS = [
  { name: 'AI developer tools', rank: 1 },
  { name: 'open source funding', rank: 2 },
  { name: 'indie SaaS launches', rank: 3 },
  { name: 'build in public', rank: 4 },
  { name: 'solo founder stories', rank: 5 },
];

async function virloGet(path, params = {}) {
  const url = new URL(`${VIRLO_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.VIRLO_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Virlo API error ${res.status}: ${body}`);
  }

  return res.json();
}

export async function getBuilderTrends() {
  if (!process.env.VIRLO_API_KEY || process.env.VIRLO_API_KEY === 'virlo_tkn_your-key-here') {
    console.warn('[virlo] No API key — using seed topics');
    return SEED_TOPICS;
  }

  try {
    const data = await virloGet('/trends', { limit: 10 });
    const trends = data?.trends || data?.data || [];

    // Filter for builder-relevant topics
    const builderKeywords = ['dev', 'code', 'saas', 'startup', 'build', 'founder', 'open source', 'ai', 'api', 'tool'];
    const filtered = trends.filter((t) => {
      const name = (t.name || t.topic || '').toLowerCase();
      return builderKeywords.some((kw) => name.includes(kw));
    });

    const result = (filtered.length >= 3 ? filtered : trends).slice(0, 5).map((t, i) => ({
      name: t.name || t.topic || t.title || 'Builder trend',
      rank: t.rank || i + 1,
    }));

    return result.length > 0 ? result : SEED_TOPICS;
  } catch (err) {
    console.error('[virlo] getBuilderTrends failed, using seed:', err.message);
    return SEED_TOPICS;
  }
}

export async function getHashtagSignal(tag) {
  if (!process.env.VIRLO_API_KEY || process.env.VIRLO_API_KEY === 'virlo_tkn_your-key-here') {
    return null;
  }

  try {
    const data = await virloGet('/hashtags', {
      query: tag,
      limit: 1,
      order_by: 'views',
      sort: 'desc',
    });
    const items = data?.hashtags || data?.data || [];
    return items[0] || null;
  } catch (err) {
    console.error(`[virlo] getHashtagSignal(${tag}) failed:`, err.message);
    return null;
  }
}

export async function getBuilderHashtagSignals() {
  const results = await Promise.allSettled(
    BUILDER_HASHTAGS.slice(0, 3).map((tag) => getHashtagSignal(tag))
  );
  return results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
}
