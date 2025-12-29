/**
 * JournalTab.jsx
 * Trading journal - Log trades, track outcomes, export history
 *
 * Ref: FILOSOFIA_FRONTEND.md - Tab: Journal
 * - Log trade (manual)
 * - Entry/Exit, strategy used, outcome
 * - Export CSV
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookBookmark,
  Plus,
  FileArrowDown,
  CaretUp,
  CaretDown,
  Check,
  X,
  Clock,
  CurrencyEur,
  Strategy,
  CalendarBlank,
  Trash,
  PencilSimple,
} from '@phosphor-icons/react';
import { MotionCard, MotionButton, MotionRow } from '../../../motion';
import './JournalTab.css';

// Trade entry form component
function TradeForm({ onSubmit, onCancel, initialData = null }) {
  const [form, setForm] = useState(
    initialData || {
      strategy: '',
      side: 'back', // back o lay
      entry: '',
      exit: '',
      stake: '',
      outcome: 'pending', // win, loss, pending, void
      notes: '',
    }
  );

  const strategies = [
    'Double Break Strategy',
    'Momentum Shift',
    'Serve Dominance',
    'Tiebreak Specialist',
    'Fatigue Factor',
    'Surface Edge',
    'H2H Pattern',
    'Other',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      entry: parseFloat(form.entry),
      exit: parseFloat(form.exit),
      stake: parseFloat(form.stake),
      timestamp: initialData?.timestamp || Date.now(),
    });
  };

  return (
    <form className="trade-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="form-label">
          Strategy
          <select
            value={form.strategy}
            onChange={(e) => setForm({ ...form, strategy: e.target.value })}
            required
          >
            <option value="">Select strategy...</option>
            {strategies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="form-label">
          Side
          <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
            <option value="back">Back</option>
            <option value="lay">Lay</option>
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="form-label">
          Entry Odds
          <input
            type="number"
            step="0.01"
            min="1.01"
            value={form.entry}
            onChange={(e) => setForm({ ...form, entry: e.target.value })}
            placeholder="1.50"
            required
          />
        </label>

        <label className="form-label">
          Exit Odds
          <input
            type="number"
            step="0.01"
            min="1.01"
            value={form.exit}
            onChange={(e) => setForm({ ...form, exit: e.target.value })}
            placeholder="1.80"
          />
        </label>

        <label className="form-label">
          Stake (€)
          <input
            type="number"
            step="1"
            min="1"
            value={form.stake}
            onChange={(e) => setForm({ ...form, stake: e.target.value })}
            placeholder="100"
            required
          />
        </label>
      </div>

      <div className="form-row">
        <label className="form-label">
          Outcome
          <select
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
            className="outcome-select"
          >
            <option value="pending">Pending</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="void">Void</option>
          </select>
        </label>
      </div>

      <label className="form-label full-width">
        Notes
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Entry reasoning, market conditions, exit strategy..."
          rows={3}
        />
      </label>

      <div className="form-actions">
        <MotionButton variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </MotionButton>
        <MotionButton variant="primary" type="submit">
          {initialData ? 'Update Trade' : 'Log Trade'}
        </MotionButton>
      </div>
    </form>
  );
}

// Single trade row
function TradeRow({ trade, onEdit, onDelete }) {
  const profitLoss = useMemo(() => {
    if (trade.outcome === 'pending' || trade.outcome === 'void' || !trade.exit) {
      return null;
    }
    if (trade.side === 'back') {
      return trade.outcome === 'win' ? trade.stake * (trade.entry - 1) : -trade.stake;
    } else {
      // Lay
      return trade.outcome === 'win' ? trade.stake : -trade.stake * (trade.entry - 1);
    }
  }, [trade]);

  const outcomeConfig = {
    win: { icon: <Check weight="bold" />, color: '#10b981', label: 'Win' },
    loss: { icon: <X weight="bold" />, color: '#ef4444', label: 'Loss' },
    pending: { icon: <Clock weight="bold" />, color: '#f59e0b', label: 'Pending' },
    void: { icon: <X weight="bold" />, color: '#6b7280', label: 'Void' },
  };

  const config = outcomeConfig[trade.outcome];
  const date = new Date(trade.timestamp);

  return (
    <MotionRow className="trade-row">
      <div className="trade-date">
        <CalendarBlank size={14} />
        {date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
        <span className="trade-time">
          {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="trade-strategy">
        <Strategy size={16} />
        {trade.strategy}
        <span className={`trade-side ${trade.side}`}>{trade.side.toUpperCase()}</span>
      </div>

      <div className="trade-odds">
        <span className="odds-entry">{trade.entry?.toFixed(2)}</span>
        {trade.exit && (
          <>
            <span className="odds-arrow">→</span>
            <span className="odds-exit">{trade.exit?.toFixed(2)}</span>
          </>
        )}
      </div>

      <div className="trade-stake">
        <CurrencyEur size={14} />
        {trade.stake?.toFixed(0)}
      </div>

      <div className="trade-outcome" style={{ color: config.color }}>
        {config.icon}
        {config.label}
      </div>

      <div className="trade-pnl">
        {profitLoss !== null ? (
          <span className={profitLoss >= 0 ? 'profit' : 'loss'}>
            {profitLoss >= 0 ? '+' : ''}
            {profitLoss.toFixed(2)}€
          </span>
        ) : (
          <span className="pending">—</span>
        )}
      </div>

      <div className="trade-actions">
        <button className="icon-btn" onClick={() => onEdit(trade)} title="Edit">
          <PencilSimple size={16} />
        </button>
        <button className="icon-btn delete" onClick={() => onDelete(trade.id)} title="Delete">
          <Trash size={16} />
        </button>
      </div>
    </MotionRow>
  );
}

// Summary stats card
function JournalStats({ trades }) {
  const stats = useMemo(() => {
    const completed = trades.filter((t) => t.outcome === 'win' || t.outcome === 'loss');
    const wins = completed.filter((t) => t.outcome === 'win');
    const losses = completed.filter((t) => t.outcome === 'loss');

    let totalPnL = 0;
    completed.forEach((t) => {
      if (t.side === 'back') {
        totalPnL += t.outcome === 'win' ? t.stake * (t.entry - 1) : -t.stake;
      } else {
        totalPnL += t.outcome === 'win' ? t.stake : -t.stake * (t.entry - 1);
      }
    });

    const winRate = completed.length > 0 ? (wins.length / completed.length) * 100 : 0;
    const avgWin =
      wins.length > 0
        ? wins.reduce(
            (acc, t) => acc + (t.side === 'back' ? t.stake * (t.entry - 1) : t.stake),
            0
          ) / wins.length
        : 0;
    const avgLoss =
      losses.length > 0
        ? losses.reduce(
            (acc, t) => acc + (t.side === 'back' ? t.stake : t.stake * (t.entry - 1)),
            0
          ) / losses.length
        : 0;

    return {
      total: trades.length,
      completed: completed.length,
      wins: wins.length,
      losses: losses.length,
      pending: trades.filter((t) => t.outcome === 'pending').length,
      winRate,
      totalPnL,
      avgWin,
      avgLoss,
      riskReward: avgLoss > 0 ? avgWin / avgLoss : 0,
    };
  }, [trades]);

  return (
    <div className="journal-stats">
      <div className="stat-box">
        <span className="stat-label">Total Trades</span>
        <span className="stat-value">{stats.total}</span>
      </div>
      <div className="stat-box">
        <span className="stat-label">Win Rate</span>
        <span className="stat-value">{stats.winRate.toFixed(1)}%</span>
      </div>
      <div className="stat-box">
        <span className="stat-label">Total P&L</span>
        <span className={`stat-value ${stats.totalPnL >= 0 ? 'profit' : 'loss'}`}>
          {stats.totalPnL >= 0 ? '+' : ''}
          {stats.totalPnL.toFixed(2)}€
        </span>
      </div>
      <div className="stat-box">
        <span className="stat-label">Avg Win</span>
        <span className="stat-value profit">+{stats.avgWin.toFixed(2)}€</span>
      </div>
      <div className="stat-box">
        <span className="stat-label">Avg Loss</span>
        <span className="stat-value loss">-{stats.avgLoss.toFixed(2)}€</span>
      </div>
      <div className="stat-box">
        <span className="stat-label">Risk/Reward</span>
        <span className="stat-value">{stats.riskReward.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function JournalTab({ bundle }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);

  // In a real app, this would be persisted in localStorage or backend
  const [trades, setTrades] = useState([
    // Demo data
    {
      id: 1,
      strategy: 'Double Break Strategy',
      side: 'back',
      entry: 1.45,
      exit: 1.25,
      stake: 100,
      outcome: 'win',
      notes: 'Strong momentum after first break',
      timestamp: Date.now() - 86400000 * 2,
    },
    {
      id: 2,
      strategy: 'Momentum Shift',
      side: 'lay',
      entry: 2.1,
      exit: 2.5,
      stake: 50,
      outcome: 'loss',
      notes: 'Entered too early, momentum reversed',
      timestamp: Date.now() - 86400000,
    },
    {
      id: 3,
      strategy: 'Serve Dominance',
      side: 'back',
      entry: 1.8,
      exit: null,
      stake: 75,
      outcome: 'pending',
      notes: 'Strong serve stats, waiting for close',
      timestamp: Date.now(),
    },
  ]);

  const handleSubmitTrade = (tradeData) => {
    if (editingTrade) {
      setTrades((prev) =>
        prev.map((t) => (t.id === editingTrade.id ? { ...tradeData, id: t.id } : t))
      );
    } else {
      setTrades((prev) => [...prev, { ...tradeData, id: Date.now() }]);
    }
    setShowForm(false);
    setEditingTrade(null);
  };

  const handleEditTrade = (trade) => {
    setEditingTrade(trade);
    setShowForm(true);
  };

  const handleDeleteTrade = (id) => {
    if (window.confirm('Delete this trade?')) {
      setTrades((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Strategy',
      'Side',
      'Entry',
      'Exit',
      'Stake',
      'Outcome',
      'P&L',
      'Notes',
    ];
    const rows = trades.map((t) => {
      let pnl = '';
      if (t.outcome === 'win' || t.outcome === 'loss') {
        if (t.side === 'back') {
          pnl = t.outcome === 'win' ? (t.stake * (t.entry - 1)).toFixed(2) : (-t.stake).toFixed(2);
        } else {
          pnl = t.outcome === 'win' ? t.stake.toFixed(2) : (-t.stake * (t.entry - 1)).toFixed(2);
        }
      }
      return [
        new Date(t.timestamp).toISOString(),
        t.strategy,
        t.side,
        t.entry,
        t.exit || '',
        t.stake,
        t.outcome,
        pnl,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-journal-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="journal-tab">
      <div className="journal-tab__header">
        <h2 className="tab-title">
          <BookBookmark size={24} weight="duotone" />
          Trading Journal
        </h2>
        <div className="header-actions">
          <MotionButton variant="ghost" onClick={handleExportCSV}>
            <FileArrowDown size={18} />
            Export CSV
          </MotionButton>
          <MotionButton variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            Log Trade
          </MotionButton>
        </div>
      </div>

      {/* Stats Summary */}
      <JournalStats trades={trades} />

      {/* Trade Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="form-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowForm(false);
              setEditingTrade(null);
            }}
          >
            <motion.div
              className="form-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="form-title">{editingTrade ? 'Edit Trade' : 'Log New Trade'}</h3>
              <TradeForm
                onSubmit={handleSubmitTrade}
                onCancel={() => {
                  setShowForm(false);
                  setEditingTrade(null);
                }}
                initialData={editingTrade}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trades List */}
      <MotionCard className="trades-list-card">
        <h3 className="card-title">
          Trade History
          <span className="trade-count">{trades.length} trades</span>
        </h3>

        {trades.length === 0 ? (
          <div className="empty-state">
            <BookBookmark size={48} weight="duotone" />
            <p>No trades logged yet</p>
            <MotionButton variant="primary" onClick={() => setShowForm(true)}>
              Log Your First Trade
            </MotionButton>
          </div>
        ) : (
          <div className="trades-list">
            {trades
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  onEdit={handleEditTrade}
                  onDelete={handleDeleteTrade}
                />
              ))}
          </div>
        )}
      </MotionCard>
    </div>
  );
}
