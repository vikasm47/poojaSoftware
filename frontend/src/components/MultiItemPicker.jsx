import { useState } from 'react';
import { formatINR } from '../api/client';

/**
 * @param {'sale'|'purchase'} mode
 * @param {Array} items - inventory items
 * @param {Array} cart - line items
 * @param {Function} onCartChange
 */
export default function MultiItemPicker({ mode = 'sale', items, cart, onCartChange }) {
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!query) return true;
    return item.name.toLowerCase().includes(query)
      || (item.sku || '').toLowerCase().includes(query)
      || (item.category || '').toLowerCase().includes(query);
  });

  function addItem(item) {
    const existing = cart.find((c) => c.item_id === item.id);
    if (existing) {
      onCartChange(cart.map((c) => (
        c.item_id === item.id ? { ...c, qty: c.qty + 1 } : c
      )));
    } else {
      onCartChange([...cart, {
        item_id: item.id,
        name: item.name,
        unit: item.unit || 'piece',
        qty: 1,
        price: item.selling_price,
        cost: item.cost_price,
      }]);
    }
  }

  function updateLine(itemId, field, value) {
    onCartChange(cart.map((c) => (
      c.item_id === itemId ? { ...c, [field]: value } : c
    )));
  }

  function updateQty(itemId, qty) {
    const parsed = parseFloat(qty);
    if (!parsed || parsed <= 0) {
      onCartChange(cart.filter((c) => c.item_id !== itemId));
    } else {
      onCartChange(cart.map((c) => (
        c.item_id === itemId ? { ...c, qty: parsed } : c
      )));
    }
  }

  function removeLine(itemId) {
    onCartChange(cart.filter((c) => c.item_id !== itemId));
  }

  const lineTotal = (line) => {
    const rate = mode === 'sale' ? line.price : line.cost;
    return (parseFloat(rate) || 0) * (parseFloat(line.qty) || 0);
  };

  const cartTotal = cart.reduce((sum, line) => sum + lineTotal(line), 0);

  return (
    <div className="multi-item-picker">
      <div className="form-group">
        <label className="label">Search &amp; add items (tap to add multiple)</label>
        <input
          className="input"
          placeholder="Search by name, SKU, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="item-picker-grid">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '1rem', gridColumn: '1 / -1' }}>No items found</div>
        ) : (
          filtered.map((item) => {
            const inCart = cart.find((c) => c.item_id === item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`item-picker-chip ${inCart ? 'in-cart' : ''}`}
                onClick={() => addItem(item)}
              >
                <span className="item-picker-name">{item.name}</span>
                <span className="item-picker-price">
                  {mode === 'sale' ? formatINR(item.selling_price) : formatINR(item.cost_price)}
                </span>
                {mode === 'sale' && (
                  <span className="item-picker-meta">Stock: {item.stock_qty}</span>
                )}
                {inCart && <span className="item-picker-meta">In cart: {inCart.qty}</span>}
              </button>
            );
          })
        )}
      </div>

      {cart.length > 0 && (
        <div className="item-cart-table-wrap">
          <div className="item-cart-header">
            <strong>Items in this {mode === 'sale' ? 'sale' : 'purchase'} ({cart.length})</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCartChange([])}>
              Clear all
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>{mode === 'sale' ? 'Price' : 'Cost'}</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.item_id}>
                    <td>{line.name}</td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        style={{ width: 80 }}
                        value={line.qty}
                        onChange={(e) => updateQty(line.item_id, e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        style={{ width: 90 }}
                        value={mode === 'sale' ? line.price : line.cost}
                        onChange={(e) => updateLine(
                          line.item_id,
                          mode === 'sale' ? 'price' : 'cost',
                          parseFloat(e.target.value) || 0
                        )}
                      />
                    </td>
                    <td>{formatINR(lineTotal(line))}</td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLine(line.item_id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="item-cart-total">
            Subtotal: <strong>{formatINR(cartTotal)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
