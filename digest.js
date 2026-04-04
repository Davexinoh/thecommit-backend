import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { generateDigest } from '../services/gemini.js';

const router = Router();

// GET /digest/:articleId
router.get('/:articleId', requireAuth, async (req, res) => {
  const { articleId } = req.params;

  const { data: article, error } = await supabase
    .from('articles')
    .select('id, headline, body, digest_bullets')
    .eq('id', articleId)
    .single();

  if (error || !article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Return cached digest if we have it
  if (article.digest_bullets && article.digest_bullets.length > 0) {
    return res.json({
      article_id: article.id,
      headline: article.headline,
      bullets: article.digest_bullets,
      cached: true,
    });
  }

  // Generate fresh and cache it
  try {
    const digest = await generateDigest(article.body);

    await supabase
      .from('articles')
      .update({ digest_bullets: digest.bullets })
      .eq('id', article.id);

    return res.json({
      article_id: article.id,
      headline: article.headline,
      bullets: digest.bullets,
      cached: false,
    });
  } catch (err) {
    return res.status(500).json({ error: `Digest generation failed: ${err.message}` });
  }
});

// GET /digest — digest of all recent articles (today's briefing)
router.get('/', requireAuth, async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, headline, subheadline, category, digest_bullets, fetched_at')
    .gte('fetched_at', since)
    .order('fetched_at', { ascending: false })
    .limit(5);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ articles, date: new Date().toISOString() });
});

export default router;
