import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAdvisorContext } from './reportService.js';
import {
  getGoogleApiKey,
  getGoogleAiModel,
  hasValidGoogleApiKey,
} from './settingsService.js';
import { getDb } from '../db/database.js';

const SYSTEM_PROMPT = `You are a business advisor for a small pooja/religious accessories shop in India.
The shop sells diyas, agarbatti, idols, pooja thalis, camphor, kumkum, garlands, bells, and similar items.

Provide practical, specific advice based on the shop's actual sales and inventory data.
Focus on festival promotions, WhatsApp/Instagram marketing, bundle offers, and inventory tips.
Keep responses concise: 5-8 bullet points, prioritized, actionable. Use ₹ for currency.
Respond in simple Hindi-English mix if helpful, but keep item names in English.`;

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

function isApiError(err) {
  const msg = err?.message || String(err);
  return msg.includes('API key')
    || msg.includes('API_KEY_INVALID')
    || msg.includes('403')
    || msg.includes('401')
    || msg.includes('PERMISSION_DENIED');
}

async function callGemini(userPrompt) {
  const apiKey = getGoogleApiKey();
  const modelId = getGoogleAiModel();
  const context = getAdvisorContext();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `${userPrompt}\n\nShop data:\n${JSON.stringify(context, null, 2)}`
  );
  return result.response.text();
}

export async function getMarketingInsights(forceRefresh = false) {
  const cacheKey = 'marketing_insights';
  if (!forceRefresh) {
    const cached = getCachedResponse(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  if (!hasValidGoogleApiKey()) {
    return {
      insights: getOfflineMarketingAdvice(),
      cached: false,
      offline: true,
    };
  }

  try {
    const text = await callGemini('Analyze this shop data and suggest marketing strategies:');
    const result = { insights: text, generatedAt: new Date().toISOString() };
    setCachedResponse(cacheKey, result);
    return { ...result, cached: false, offline: false, model: getGoogleAiModel() };
  } catch (err) {
    if (isApiError(err)) {
      return {
        insights: getOfflineMarketingAdvice(),
        cached: false,
        offline: true,
        apiError: 'Invalid Google API key — showing offline suggestions. Add your key in Admin → AI Settings.',
      };
    }
    throw err;
  }
}

export async function getInventoryInsights(forceRefresh = false) {
  const cacheKey = 'inventory_insights';
  if (!forceRefresh) {
    const cached = getCachedResponse(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  if (!hasValidGoogleApiKey()) {
    return {
      insights: getOfflineInventoryAdvice(),
      cached: false,
      offline: true,
    };
  }

  try {
    const text = await callGemini('Suggest what to stock more, what to discount, and new items to add:');
    const result = { insights: text, generatedAt: new Date().toISOString() };
    setCachedResponse(cacheKey, result);
    return { ...result, cached: false, offline: false, model: getGoogleAiModel() };
  } catch (err) {
    if (isApiError(err)) {
      return {
        insights: getOfflineInventoryAdvice(),
        cached: false,
        offline: true,
        apiError: 'Invalid Google API key — showing offline suggestions. Add your key in Admin → AI Settings.',
      };
    }
    throw err;
  }
}

export async function askAdvisor(question) {
  if (!hasValidGoogleApiKey()) {
    return {
      answer: 'AI advisor requires a valid Google API key.\n\nGo to Admin → AI Settings and add your key.\nOr set GOOGLE_API_KEY in .env file.\n\nGet a key at: aistudio.google.com/apikey',
      offline: true,
    };
  }

  try {
    const text = await callGemini(`Question: ${question}`);
    return { answer: text, offline: false, model: getGoogleAiModel() };
  } catch (err) {
    if (isApiError(err)) {
      return {
        answer: 'Your Google API key is invalid or the selected model is unavailable. Update it in Admin → AI Settings and try a different model.',
        offline: true,
      };
    }
    throw err;
  }
}

function getOfflineMarketingAdvice() {
  const ctx = getAdvisorContext();
  const top = ctx.topSellers.slice(0, 3).map((i) => i.name).join(', ') || 'your bestsellers';
  return `Marketing Suggestions (based on your shop data)

• Create a WhatsApp broadcast list for regular customers with weekly puja essentials
• Bundle ${top} into a "Complete Pooja Kit" at 10% discount before festivals
• Post daily Instagram stories showing new stock
• Offer ₹20 off on purchases above ₹500
• Partner with nearby temples for festival stalls
• Run Friday/Saturday specials on incense and camphor
• Print price list with UPI QR code`;
}

function getOfflineInventoryAdvice() {
  const ctx = getAdvisorContext();
  const low = ctx.lowStock.map((i) => i.name).join(', ') || 'none';
  const slow = ctx.slowMovers.map((i) => i.name).join(', ') || 'none';
  return `Inventory Suggestions (based on your shop data)

• Restock immediately: ${low}
• Consider 15-20% discount on slow movers: ${slow}
• Add complementary items: cotton wicks, pooja oil near diyas
• Stock up 2-3 weeks before Diwali, Navratri, Ganesh Chaturthi
• Keep fast-moving agarbatti at 2x stock before festivals
• Review zero-sale items in 30 days
• Add "Puja Starter Kit" combining top sellers`;
}
