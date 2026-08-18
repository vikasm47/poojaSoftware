import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAiSettings,
  saveAiSettings,
  GOOGLE_AI_MODELS,
} from '../services/settingsService.js';

const router = Router();

router.get('/categories', (_req, res) => {
  res.json(listCategories());
});

router.post('/categories', (req, res) => {
  try {
    const category = createCategory(req.body.name);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const category = updateCategory(parseInt(req.params.id, 10), req.body.name);
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/categories/:id', (req, res) => {
  try {
    const result = deleteCategory(parseInt(req.params.id, 10));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/ai-settings', (_req, res) => {
  res.json(getAiSettings());
});

router.get('/ai-models', (_req, res) => {
  res.json(GOOGLE_AI_MODELS);
});

router.put('/ai-settings', (req, res) => {
  try {
    const settings = saveAiSettings(req.body);
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
