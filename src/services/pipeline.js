import { getBuilderTrends } from './virlo.js';
import { searchHN } from './hackernews.js';
import { generateArticle } from './groq.js';
import { generateDigest } from './gemini.js';
import { supabase } from '../db/supabase.js';

let isRunning = false;

export async function runPipeline() {
  if (isRunning) {
    console.log('[pipeline] Already running, skipping');
    return;
  }

  isRunning = true;
  console.log('[pipeline] Starting article generation run...');

  try {
    // Step 1: Get trending builder topics from Virlo
    const trends = await getBuilderTrends();
    console.log(`[pipeline] Got ${trends.length} trends from Virlo`);

    // Step 2: For each trend, find HN sources and generate an article
    const results = [];

    for (const trend of trends.slice(0, 3)) {
      try {
        console.log(`[pipeline] Processing topic: "${trend.name}"`);

        // Check if we already have a recent article on this topic (last 12hrs)
        const twelveHrsAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .ilike('topic', `%${trend.name.split(' ')[0]}%`)
          .gte('fetched_at', twelveHrsAgo)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[pipeline] Skipping "${trend.name}" — recent article exists`);
          continue;
        }

        // Step 3: Fetch HN source stories
        const sources = await searchHN(trend.name, 3);
        if (sources.length === 0) {
          console.log(`[pipeline] No HN sources found for "${trend.name}", skipping`);
          continue;
        }

        // Step 4: Generate article with Groq
        const article = await generateArticle({ topic: trend.name, sources });

        // Step 5: Generate digest with Gemini
        const digest = await generateDigest(article.body);

        // Step 6: Save to Supabase
        const { data, error } = await supabase
          .from('articles')
          .insert({
            topic: trend.name,
            headline: article.headline,
            subheadline: article.subheadline,
            body: article.body,
            category: article.category,
            read_time_minutes: article.read_time_minutes || 3,
            digest_bullets: digest.bullets,
            sources: sources.map((s) => ({ title: s.title, url: s.url })),
            virlo_rank: trend.rank,
            fetched_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error(`[pipeline] Supabase insert error for "${trend.name}":`, error.message);
        } else {
          console.log(`[pipeline] ✓ Saved article: "${article.headline}"`);
          results.push(data);
        }

        // Respectful delay between AI calls
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        console.error(`[pipeline] Error processing "${trend.name}":`, err.message);
      }
    }

    console.log(`[pipeline] Run complete. ${results.length} new articles saved.`);
    return results;
  } finally {
    isRunning = false;
  }
}
