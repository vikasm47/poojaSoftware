import { Router } from 'express';
import { getReport, getInventoryReport, getDashboardStats } from '../services/reportService.js';
import {
  generateExcelReport, generateInventoryExcel,
  generatePdfReport, generateInventoryPdf,
} from '../services/exportService.js';

const router = Router();

router.get('/dashboard', (_req, res) => {
  res.json(getDashboardStats());
});

router.get('/sales/:period', (req, res) => {
  const { period } = req.params;
  const { from, to } = req.query;
  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    return res.status(400).json({ error: 'Period must be daily, weekly, or monthly' });
  }
  res.json(getReport(period, from, to));
});

router.get('/inventory', (_req, res) => {
  res.json(getInventoryReport());
});

router.get('/pnl', (req, res) => {
  const { from, to } = req.query;
  const now = new Date();
  const start = from || `${now.getFullYear()}-01-01`;
  const end = to || now.toISOString().slice(0, 10);
  const report = getReport('monthly', start, end);
  res.json({
    from: start,
    to: end,
    revenue: report.summary.revenue,
    cost: report.summary.cost,
    grossProfit: report.summary.profit,
    profitMargin: report.summary.profitMargin,
  });
});

router.get('/export/sales/:period', async (req, res) => {
  const { period } = req.params;
  const { from, to, format = 'xlsx' } = req.query;

  try {
    if (format === 'pdf') {
      const buffer = await generatePdfReport(period, from, to);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${period}.pdf`);
      return res.send(buffer);
    }

    const buffer = await generateExcelReport(period, from, to);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${period}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/inventory', async (req, res) => {
  const { format = 'xlsx' } = req.query;

  try {
    if (format === 'pdf') {
      const buffer = await generateInventoryPdf();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.pdf');
      return res.send(buffer);
    }

    const buffer = await generateInventoryExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.xlsx');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
