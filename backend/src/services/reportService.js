import { getDb, formatItem, getStockStatus } from '../db/database.js';

function getShopId() {
  return getDb().prepare('SELECT id FROM shops LIMIT 1').get().id;
}

function dateRangeFilter(period, from, to) {
  const now = new Date();
  let start, end;

  switch (period) {
    case 'daily':
      start = from || now.toISOString().slice(0, 10);
      end = to || start;
      break;
    case 'weekly': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      start = from || d.toISOString().slice(0, 10);
      end = to || now.toISOString().slice(0, 10);
      break;
    }
    case 'monthly':
      start = from || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      end = to || now.toISOString().slice(0, 10);
      break;
    default:
      start = from;
      end = to;
  }

  return { start, end };
}

export function getSalesData(start, end) {
  const db = getDb();
  const shopId = getShopId();

  const sales = db.prepare(`
    SELECT s.*, si.item_id, si.qty, si.price_at_sale, si.cost_at_sale, i.name, i.category
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN items i ON i.id = si.item_id
    WHERE s.shop_id = ? AND date(s.sale_date) >= date(?) AND date(s.sale_date) <= date(?)
    ORDER BY s.sale_date DESC
  `).all(shopId, start, end);

  let revenue = 0;
  let cost = 0;
  const itemMap = {};
  const categoryMap = {};
  const dailyMap = {};

  for (const row of sales) {
    const lineRevenue = row.qty * row.price_at_sale;
    const lineCost = row.qty * row.cost_at_sale;
    revenue += lineRevenue;
    cost += lineCost;

    if (!itemMap[row.item_id]) {
      itemMap[row.item_id] = { id: row.item_id, name: row.name, category: row.category, qty: 0, revenue: 0 };
    }
    itemMap[row.item_id].qty += row.qty;
    itemMap[row.item_id].revenue += lineRevenue;

    categoryMap[row.category] = (categoryMap[row.category] || 0) + lineRevenue;

    const day = row.sale_date.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, profit: 0, transactions: 0 };
    dailyMap[day].revenue += lineRevenue;
    dailyMap[day].profit += lineRevenue - lineCost;
  }

  const uniqueSales = new Set(sales.map((s) => s.id));
  for (const day of Object.values(dailyMap)) {
    day.transactions = sales.filter((s) => s.sale_date.startsWith(day.date)).length;
  }

  const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }));
  const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    revenue,
    cost,
    profit: revenue - cost,
    profitMargin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    transactionCount: uniqueSales.size,
    topItems,
    categoryBreakdown,
    dailyTrend,
    sales,
  };
}

export function getReport(period, from, to) {
  const { start, end } = dateRangeFilter(period, from, to);
  const data = getSalesData(start, end);

  return {
    period,
    from: start,
    to: end,
    summary: {
      revenue: data.revenue,
      cost: data.cost,
      profit: data.profit,
      profitMargin: Math.round(data.profitMargin * 100) / 100,
      transactionCount: data.transactionCount,
    },
    topItems: data.topItems,
    categoryBreakdown: data.categoryBreakdown,
    dailyTrend: data.dailyTrend,
  };
}

export function getInventoryReport() {
  const db = getDb();
  const shopId = getShopId();
  const items = db.prepare('SELECT * FROM items WHERE shop_id = ? ORDER BY category, name').all(shopId).map(formatItem);

  let costValue = 0;
  let sellingValue = 0;
  const statusCounts = { in_stock: 0, low_stock: 0, out_of_stock: 0 };
  const categoryCounts = {};

  for (const item of items) {
    costValue += item.cost_price * item.stock_qty;
    sellingValue += item.selling_price * item.stock_qty;
    statusCounts[item.stock_status]++;
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  return {
    totalItems: items.length,
    statusCounts,
    categoryCounts,
    costValue,
    sellingValue,
    potentialProfit: sellingValue - costValue,
    items,
  };
}

export function getDashboardStats() {
  const db = getDb();
  const shopId = getShopId();
  const today = new Date().toISOString().slice(0, 10);

  const todayData = getSalesData(today, today);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekData = getSalesData(weekStart.toISOString().slice(0, 10), today);

  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const monthData = getSalesData(monthStart, today);

  const alerts = db.prepare('SELECT * FROM items WHERE shop_id = ? ORDER BY stock_qty ASC').all(shopId)
    .map(formatItem)
    .filter((i) => i.stock_status !== 'in_stock')
    .slice(0, 10);

  const recentSales = db.prepare(`
    SELECT s.*, GROUP_CONCAT(i.name || ' x' || si.qty, ', ') as items_summary
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN items i ON i.id = si.item_id
    WHERE s.shop_id = ?
    GROUP BY s.id
    ORDER BY s.sale_date DESC
    LIMIT 5
  `).all(shopId);

  return {
    today: {
      revenue: todayData.revenue,
      profit: todayData.profit,
      transactions: todayData.transactionCount,
    },
    week: { revenue: weekData.revenue, profit: weekData.profit },
    month: { revenue: monthData.revenue, profit: monthData.profit },
    alerts,
    recentSales,
  };
}

export function getAdvisorContext() {
  const db = getDb();
  const shopId = getShopId();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const start = thirtyDaysAgo.toISOString().slice(0, 10);
  const end = new Date().toISOString().slice(0, 10);

  const salesData = getSalesData(start, end);
  const inventory = getInventoryReport();

  const slowMovers = inventory.items
    .filter((item) => {
      const sold = salesData.topItems.find((t) => t.id === item.id);
      return !sold || sold.qty < 3;
    })
    .slice(0, 10)
    .map((i) => ({ name: i.name, category: i.category, stock: i.stock_qty }));

  return {
    period: `${start} to ${end}`,
    revenue: salesData.revenue,
    profit: salesData.profit,
    topSellers: salesData.topItems.slice(0, 8),
    categoryBreakdown: salesData.categoryBreakdown,
    lowStock: inventory.items.filter((i) => i.stock_status !== 'in_stock').slice(0, 8),
    slowMovers,
    totalCatalogItems: inventory.totalItems,
  };
}
