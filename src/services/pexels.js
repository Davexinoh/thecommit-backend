import fetch from 'node-fetch';

const PEXELS_BASE = 'https://api.pexels.com/v1';

// Category → search query mapping for better results
const CATEGORY_QUERIES = {
  AI: 'artificial intelligence technology',
  Tools: 'developer tools software',
  Funding: 'startup investment business',
  'Open Source': 'open source code collaboration',
  SaaS: 'software as a service cloud',
  Community: 'developer community tech meetup',
};

export async function fetchCoverImage(topic, category) {
  if (!process.env.PEXELS_API_KEY) {
    console.warn('[pexels] No API key — skipping cover image');
    return null;
  }

  // Build search query: topic keywords + category fallback
  const topicWords = topic.split(' ').slice(0, 3).join(' ');
  const categoryQuery = CATEGORY_QUERIES[category] || 'technology';
  const query = encodeURIComponent(`${topicWords} ${categoryQuery}`);

  try {
    const res = await fetch(
      `${PEXELS_BASE}/search?query=${query}&per_page=5&orientation=portrait`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    if (!res.ok) {
      console.error(`[pexels] API error ${res.status}`);
      return null;
    }

    const data = await res.json();
    const photos = data?.photos || [];
    if (photos.length === 0) return null;

    // Pick a photo deterministically based on topic length to avoid always same image
    const idx = topic.length % photos.length;
    const photo = photos[idx];

    return {
      url: photo.src.large,
      photographer: photo.photographer,
      photographer_url: photo.photographer_url,
    };
  } catch (err) {
    console.error('[pexels] fetchCoverImage failed:', err.message);
    return null;
  }
}
