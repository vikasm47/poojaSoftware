import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Advisor() {
  const [marketing, setMarketing] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('marketing');

  async function loadMarketing(refresh = false) {
    setLoading('marketing');
    setError('');
    try {
      const data = await api.getMarketingInsights(refresh);
      setMarketing(data);
    } catch (err) {
      setError(err.message);
      setMarketing({ insights: 'Could not load marketing insights. Please try again.', offline: true });
    } finally {
      setLoading('');
    }
  }

  async function loadInventory(refresh = false) {
    setLoading('inventory');
    setError('');
    try {
      const data = await api.getInventoryInsights(refresh);
      setInventory(data);
    } catch (err) {
      setError(err.message);
      setInventory({ insights: 'Could not load inventory insights. Please try again.', offline: true });
    } finally {
      setLoading('');
    }
  }

  useEffect(() => {
    loadMarketing();
    loadInventory();
  }, []);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading('ask');
    setAnswer(null);
    setError('');
    try {
      const result = await api.askAdvisor(question);
      setAnswer(result);
    } catch (err) {
      setAnswer({
        answer: err.message || 'Something went wrong. Please try again.',
        offline: true,
      });
    } finally {
      setLoading('');
    }
  }

  function renderInsights(data, loadingKey) {
    if (loading === loadingKey && !data) {
      return <div className="empty-state" style={{ padding: '1.5rem' }}>Loading insights...</div>;
    }
    if (!data?.insights) {
      return <div className="empty-state" style={{ padding: '1.5rem' }}>No insights available.</div>;
    }
    return <div className="markdown-content">{data.insights}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Business Advisor</h1>
          <p className="page-subtitle">Marketing and inventory insights powered by Google Gemini</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'marketing', label: 'Marketing Ideas' },
          { id: 'inventory', label: 'Inventory Tips' },
          { id: 'ask', label: 'Ask a Question' },
        ].map((t) => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {tab === 'marketing' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Marketing Strategy Suggestions</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => loadMarketing(true)} disabled={loading === 'marketing'}>
              {loading === 'marketing' ? 'Refreshing...' : 'Refresh Insights'}
            </button>
          </div>
          {marketing?.offline && (
            <div className="alert alert-info">
              {marketing.apiError || 'Running in offline mode using your shop data. Add a Google API key in Admin → AI Settings.'}
            </div>
          )}
          {marketing?.cached && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cached insights (refreshes weekly)</p>}
          {renderInsights(marketing, 'marketing')}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Inventory Expansion Suggestions</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => loadInventory(true)} disabled={loading === 'inventory'}>
              {loading === 'inventory' ? 'Refreshing...' : 'Refresh Insights'}
            </button>
          </div>
          {inventory?.offline && (
            <div className="alert alert-info">
              {inventory.apiError || 'Running in offline mode using your shop data. Add a Google API key in Admin → AI Settings.'}
            </div>
          )}
          {renderInsights(inventory, 'inventory')}
        </div>
      )}

      {tab === 'ask' && (
        <div className="card">
          <h2 className="card-title">Ask the Advisor</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Try: "What should I stock more of before Diwali?" or "Which items should I put on discount?"
          </p>
          <form onSubmit={handleAsk}>
            <textarea className="textarea" rows={3} value={question} placeholder="Type your question..."
              onChange={(e) => setQuestion(e.target.value)} />
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} disabled={loading === 'ask'}>
              {loading === 'ask' ? 'Thinking...' : 'Get Answer'}
            </button>
          </form>
          {answer && (
            <div className="markdown-content" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--primary-light)', borderRadius: 8 }}>
              {answer.answer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
