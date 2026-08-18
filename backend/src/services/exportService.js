import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { getReport, getInventoryReport } from './reportService.js';
import { config } from '../config.js';

function formatINR(amount) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generateExcelReport(period, from, to) {
  const report = getReport(period, from, to);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VIMMS';

  const sheet = workbook.addWorksheet('Sales Report');
  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  sheet.addRow({ metric: 'Shop', value: config.shopName });
  sheet.addRow({ metric: 'Period', value: `${report.from} to ${report.to}` });
  sheet.addRow({ metric: 'Revenue', value: report.summary.revenue });
  sheet.addRow({ metric: 'Cost', value: report.summary.cost });
  sheet.addRow({ metric: 'Profit', value: report.summary.profit });
  sheet.addRow({ metric: 'Profit Margin %', value: report.summary.profitMargin });
  sheet.addRow({ metric: 'Transactions', value: report.summary.transactionCount });
  sheet.addRow({});

  const topSheet = workbook.addWorksheet('Top Items');
  topSheet.columns = [
    { header: 'Item', key: 'name', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Qty Sold', key: 'qty', width: 12 },
    { header: 'Revenue', key: 'revenue', width: 15 },
  ];
  report.topItems.forEach((item) => topSheet.addRow(item));

  const catSheet = workbook.addWorksheet('Category Breakdown');
  catSheet.columns = [
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Revenue', key: 'amount', width: 15 },
  ];
  report.categoryBreakdown.forEach((c) => catSheet.addRow(c));

  return workbook.xlsx.writeBuffer();
}

export async function generateInventoryExcel() {
  const report = getInventoryReport();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inventory');

  sheet.columns = [
    { header: 'SKU', key: 'sku', width: 12 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Stock', key: 'stock_qty', width: 10 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Cost', key: 'cost_price', width: 12 },
    { header: 'Selling', key: 'selling_price', width: 12 },
    { header: 'Status', key: 'stock_status', width: 14 },
  ];

  report.items.forEach((item) => sheet.addRow(item));
  sheet.addRow({});
  sheet.addRow({ name: 'Total Cost Value', stock_qty: report.costValue });
  sheet.addRow({ name: 'Total Selling Value', stock_qty: report.sellingValue });

  return workbook.xlsx.writeBuffer();
}

export function generatePdfReport(period, from, to) {
  const report = getReport(period, from, to);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(config.shopName, { align: 'center' });
    doc.fontSize(14).text(`${period.charAt(0).toUpperCase() + period.slice(1)} Sales Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Period: ${report.from} to ${report.to}`);
    doc.moveDown();

    doc.fontSize(12).text('Summary', { underline: true });
    doc.fontSize(10);
    doc.text(`Revenue: ${formatINR(report.summary.revenue)}`);
    doc.text(`Cost: ${formatINR(report.summary.cost)}`);
    doc.text(`Profit: ${formatINR(report.summary.profit)}`);
    doc.text(`Profit Margin: ${report.summary.profitMargin}%`);
    doc.text(`Transactions: ${report.summary.transactionCount}`);
    doc.moveDown();

    doc.fontSize(12).text('Top Selling Items', { underline: true });
    doc.fontSize(10);
    report.topItems.slice(0, 10).forEach((item, i) => {
      doc.text(`${i + 1}. ${item.name} — ${item.qty} sold — ${formatINR(item.revenue)}`);
    });
    doc.moveDown();

    doc.fontSize(12).text('Category Breakdown', { underline: true });
    doc.fontSize(10);
    report.categoryBreakdown.forEach((c) => {
      doc.text(`${c.category}: ${formatINR(c.amount)}`);
    });

    doc.end();
  });
}

export function generateInventoryPdf() {
  const report = getInventoryReport();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(config.shopName, { align: 'center' });
    doc.fontSize(14).text('Inventory Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Total Items: ${report.totalItems}`);
    doc.text(`In Stock: ${report.statusCounts.in_stock} | Low Stock: ${report.statusCounts.low_stock} | Out of Stock: ${report.statusCounts.out_of_stock}`);
    doc.text(`Inventory Value (Cost): ${formatINR(report.costValue)}`);
    doc.text(`Inventory Value (Selling): ${formatINR(report.sellingValue)}`);
    doc.moveDown();

    doc.fontSize(12).text('Stock List', { underline: true });
    doc.fontSize(9);
    report.items.forEach((item) => {
      doc.text(`${item.sku} | ${item.name} | ${item.stock_qty} ${item.unit} | ${item.stock_status.replace('_', ' ')}`);
    });

    doc.end();
  });
}
