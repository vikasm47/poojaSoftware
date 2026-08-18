import { Router } from 'express';
import { getMarketingInsights, getInventoryInsights, askAdvisor } from '../services/advisorService.js';

const router = Router();

router.get('/marketing', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const result = await getMarketingInsights(forceRefresh);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const result = await getInventoryInsights(forceRefresh);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }
    const result = await askAdvisor(question.trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
