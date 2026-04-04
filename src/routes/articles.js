import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { runPipeline } from '../services/pipeline.js';

const router = Router();

// GET /articles — paginated feed (protected)
router.get('/', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const category = req.query.category;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('articles')
    .select('id, headline, subheadline, category, read_time_minutes, virlo_rank, fetched_at', { count: 'exact' })
    .order('fetched_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    articles: data,
    total: count,
    page,
    total_pages: Math.ceil(count / limit),
  });
});

// GET /articles/:id — full article (protected)
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Article not found' });
  }

  return res.json(data);
});

// POST /articles/pipeline/run — manually trigger pipeline (protected)
router.post('/pipeline/run', requireAuth, async (req, res) => {
  res.json({ message: 'Pipeline started. Check back in ~60 seconds for new articles.' });
  // Fire and forget — don't await
  runPipeline().catch((err) => console.error('[pipeline] Manual run error:', err.message));
});

export default router;
