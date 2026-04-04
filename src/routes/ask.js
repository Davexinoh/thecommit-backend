import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { answerQuestion } from '../services/gemini.js';

const router = Router();

// POST /ask/:articleId
router.post('/:articleId', requireAuth, async (req, res) => {
  const { articleId } = req.params;
  const { question } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'Question is required' });
  }

  if (question.length > 500) {
    return res.status(400).json({ error: 'Question must be under 500 characters' });
  }

  const { data: article, error } = await supabase
    .from('articles')
    .select('id, headline, body')
    .eq('id', articleId)
    .single();

  if (error || !article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  try {
    const answer = await answerQuestion({
      articleBody: `${article.headline}\n\n${article.body}`,
      question: question.trim(),
    });

    return res.json({
      article_id: article.id,
      question: question.trim(),
      answer,
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to answer question: ${err.message}` });
  }
});

export default router;
