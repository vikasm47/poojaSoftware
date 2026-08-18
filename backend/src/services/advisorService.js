import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/database.js';
import { getAdvisorContext } from './reportService.js';
import { config } from '../config.js';

const SYSTEM_PROMPT = `You are a business advisor for a small pooja/religious accessories shop in India.
The shop sells diyas, agarbatti, idols, pooja thalis, camphor, kumkum, garlands, bells, and similar items.

Provide practical, specific advice based on the shop's actual sales and inventory data.
Focus on:
- Festival-specific promotions (Diwali, Navratri, Ganesh Chaturthi, weekly puja days)
- WhatsApp/Instagram marketing for local Indian customers
- Bundle offers and loyalty ideas
- Inventory expansion or discounting slow movers
- Local temple/community tie-ins

Keep responses concise: 5-8 bullet points, prioritized, actionable. Use ₹ for currency.
Respond in simple Hindi-English mix if helpful for a small shop owner, but keep item names in English.`;

function getShopId() {
  return getDb().prepare('SELECT id FROM shops LIMIT 1').get().id;
}

function getCachedResponse(cacheKey) {
  const db = getDb();
  const shopId = getShopId();
  const cached = db.prepare(
    'SELECT * FROM advisor_cache WHERE shop_id = ? AND cache_key = ? ORDER BY created_at DESC LIMIT 1'
  ).get(shopId, cacheKey);

  if (!cached) return null;

  const age = Date.now() - new Date(cached.created_at).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (age > sevenDays) return null;

  return JSON.parse(cached.response_json);
}

function setCachedResponse(cacheKey, response) {
  const db = getDb();
  const shopId = getShopId();
  db.prepare(`
    INSERT INTO advisor_cache (shop_id, cache_key, response_json) VALUES (?, ?, ?)
    ON CONFLICT(shop_id, cache_key) DO UPDATE SET response_json = excluded.response_json, created_at = datetime('now')
  `).run(shopId, cacheKey, JSON.stringify(response));
}

export async function getMarketingInsights(forceRefresh = false) {
  const cacheKey = 'marketing_insights';
  if (!forceRefresh) {
    const cached = getCachedResponse(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  if (!config.anthropicApiKey) {
    return {
      insights: getOfflineMarketingAdvice(),
      cached: false,
      offline: true,
    };
  }

  const context = getAdvisorContext();
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Analyze this shop data and suggest marketing strategies:\n\n${JSON.stringify(context, null, 2)}`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const result = { insights: text, generatedAt: new Date().toISOString() };
  setCachedResponse(cacheKey, result);
  return { ...result, cached: false };
}

export async function getInventoryInsights(forceRefresh = false) {
  const cacheKey = 'inventory_insights';
  if (!forceRefresh) {
    const cached = getCachedResponse(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  if (!config.anthropicApiKey) {
    return {
      insights: getOfflineInventoryAdvice(),
      cached: false,
      offline: true,
    };
  }

  const context = getAdvisorContext();
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Based on this inventory and sales data, suggest what to stock more, what to discount, and new items to add:\n\n${JSON.stringify(context, null, 2)}`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const result = { insights: text, generatedAt: new Date().toISOString() };
  setCachedResponse(cacheKey, result);
  return { ...result, cached: false };
}

export async function askAdvisor(question) {
  if (!config.anthropicApiKey) {
    return {
      answer: 'AI advisor requires an Anthropic API key. Add ANTHROPIC_API_KEY to backend/.env file.',
      offline: true,
    };
  }

  const context = getAdvisorContext();
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Shop data:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return { answer: text };
}

function getOfflineMarketingAdvice() {
  const ctx = getAdvisorContext();
  const top = ctx.topSellers.slice(0, 3).map((i) => i.name).join(', ') || 'your bestsellers';
  return `**Marketing Suggestions (offline mode — add API key for AI insights)**

• Create a WhatsApp broadcast list for regular customers with weekly puja essentials
• Bundle ${top} into a "Complete Pooja Kit" at 10% discount before festivals
• Post daily Instagram stories showing new stock — diyas, agarbatti, thalis get most engagement
• Offer ₹20 off on purchases above ₹500 to encourage larger baskets
• Partner with nearby temples for festival stall or donation bundles
• Run "Friday/Saturday Special" — 5% off on incense and camphor (peak puja days)
• Print simple price list with QR code for UPI payments`;
}

function getOfflineInventoryAdvice() {
  const ctx = getAdvisorContext();
  const low = ctx.lowStock.map((i) => i.name).join(', ') || 'none';
  const slow = ctx.slowMovers.map((i) => i.name).join(', ') || 'none';
  return `**Inventory Suggestions (offline mode — add API key for AI insights)**

• Restock immediately: ${low}
• Consider 15-20% discount on slow movers: ${slow}
• Add complementary items: cotton wicks, pooja oil, matchboxes near diyas
• Stock up 2-3 weeks before Diwali, Navratri, Ganesh Chaturthi
• Keep fast-moving agarbatti and camphor at 2x normal stock before festivals
• Review items with zero sales in 30 days — reduce reorder quantity
• Add "Puja Starter Kit" category combining top 5 sellers`;
}
