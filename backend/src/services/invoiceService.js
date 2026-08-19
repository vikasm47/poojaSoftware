import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { getDb } from '../db/database.js';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatINR(amount) {
  return `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getLogoPath() {
  const candidates = [
    path.join(config.frontendDist, 'logo.png'),
    path.join(__dirname, '../../../frontend/public/logo.png'),
    path.join(__dirname, '../../../electron/icon.png'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export function generateSaleInvoice(saleId) {
  const db = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
  if (!sale) throw new Error('Sale not found');

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(sale.shop_id);
  const items = db.prepare(`
    SELECT si.*, i.name, i.unit, i.sku
    FROM sale_items si
    JOIN items i ON i.id = si.item_id
    WHERE si.sale_id = ?
  `).all(saleId);

  const subtotal = items.reduce((sum, line) => sum + line.price_at_sale * line.qty, 0);
  const logoPath = getLogoPath();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let y = doc.page.margins.top;

    if (logoPath) {
      try {
        doc.image(logoPath, doc.page.margins.left + pageWidth / 2 - 40, y, { width: 80 });
        y += 90;
      } catch {
        y += 10;
      }
    }

    doc.fontSize(20).font('Helvetica-Bold').text(shop?.name || config.shopName, doc.page.margins.left, y, {
      width: pageWidth,
      align: 'center',
    });
    y = doc.y + 4;

    if (shop?.address || shop?.phone) {
      doc.fontSize(9).font('Helvetica').fillColor('#555555');
      const shopInfo = [shop.address, shop.phone ? `Phone: ${shop.phone}` : ''].filter(Boolean).join(' | ');
      doc.text(shopInfo, doc.page.margins.left, y, { width: pageWidth, align: 'center' });
      y = doc.y + 12;
    }

    doc.fillColor('#000000');
    doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', doc.page.margins.left, y, {
      width: pageWidth,
      align: 'center',
    });
    y = doc.y + 16;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice No: INV-${String(sale.id).padStart(5, '0')}`, doc.page.margins.left, y);
    doc.text(`Date: ${formatDate(sale.sale_date)}`, doc.page.margins.left, y, { width: pageWidth, align: 'right' });
    y = doc.y + 14;

    if (sale.customer_name || sale.customer_address) {
      doc.font('Helvetica-Bold').text('Bill To:', doc.page.margins.left, y);
      y = doc.y + 2;
      doc.font('Helvetica');
      if (sale.customer_name) {
        doc.text(sale.customer_name, doc.page.margins.left, y);
        y = doc.y + 2;
      }
      if (sale.customer_address) {
        doc.text(sale.customer_address, doc.page.margins.left, y, { width: pageWidth * 0.6 });
        y = doc.y + 2;
      }
      y += 10;
    }

    const colX = [doc.page.margins.left, 220, 320, 380, 460];
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Item', colX[0], y);
    doc.text('Qty', colX[1], y);
    doc.text('Rate', colX[2], y);
    doc.text('Amount', colX[3], y);
    y += 14;
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + pageWidth, y).stroke('#cccccc');
    y += 8;

    doc.font('Helvetica').fontSize(9);
    for (const line of items) {
      const amount = line.price_at_sale * line.qty;
      doc.text(line.name, colX[0], y, { width: 150 });
      doc.text(`${line.qty} ${line.unit || ''}`, colX[1], y);
      doc.text(formatINR(line.price_at_sale), colX[2], y);
      doc.text(formatINR(amount), colX[3], y);
      y += 16;
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    y += 8;
    doc.moveTo(doc.page.margins.left + pageWidth * 0.55, y)
      .lineTo(doc.page.margins.left + pageWidth, y).stroke('#cccccc');
    y += 10;

    const summaryX = doc.page.margins.left + pageWidth * 0.55;
    doc.text(`Subtotal: ${formatINR(subtotal)}`, summaryX, y, { width: pageWidth * 0.45, align: 'right' });
    y += 14;
    if (sale.discount > 0) {
      doc.text(`Discount: -${formatINR(sale.discount)}`, summaryX, y, { width: pageWidth * 0.45, align: 'right' });
      y += 14;
    }
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`Total: ${formatINR(sale.total_amount)}`, summaryX, y, { width: pageWidth * 0.45, align: 'right' });
    y += 18;
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    doc.text(`Payment: ${(sale.payment_mode || 'cash').toUpperCase()}`, doc.page.margins.left, y);
    y += 20;
    doc.text('Thank you for your business!', doc.page.margins.left, y, { width: pageWidth, align: 'center' });

    doc.end();
  });
}
