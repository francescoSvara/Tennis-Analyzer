import React, { useEffect, useState } from 'react';
import styles from '../styles/statistics.module.css';
import { normalizeApiResponse } from '../utils';

export default function Gestionale({ onClose, prefill = null }) {
  const [raw, setRaw] = useState(null);
  const [normalized, setNormalized] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  // If a prefill object arrives (from App scrapeData), populate the form
  useEffect(() => {
    if (!prefill) return;
    // only populate if form is empty (user didn't type anything yet)
    const isFormEmpty =
      Object.keys(form).length === 0 ||
      Object.values(form).every((v) => v === '' || v === null || v === undefined);
    if (!isFormEmpty) return;
    try {
      setRaw(prefill._raw || null);
      setNormalized(prefill);
      const initial = {
        eventId:
          prefill._raw && prefill._raw.event
            ? prefill._raw.event.id
            : prefill._raw?.event?.id || '',
        homeName: prefill.home?.name || prefill.home?.name || '',
        awayName: prefill.away?.name || prefill.away?.name || '',
        tournament:
          (prefill._raw &&
            prefill._raw.event &&
            prefill._raw.event.tournament &&
            prefill._raw.event.tournament.name) ||
          '',
        status:
          (prefill._raw &&
            prefill._raw.event &&
            prefill._raw.event.status &&
            prefill._raw.event.status.description) ||
          '',
      };
      setForm(initial);
    } catch (e) {
      // ignore
    }
  }, [prefill]);

  function onChange(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  function handleSave() {
    try {
      localStorage.setItem('gestionaleData', JSON.stringify(form));
      setSaved(true);
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className={styles.statisticsContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Gestionale evento</h1>
        <div>
          <button onClick={handleSave} style={{ marginRight: 8 }}>
            Salva (local)
          </button>
          <button onClick={onClose}>Chiudi</button>
        </div>
      </div>

      {!raw && !prefill && (
        <p>
          I campi sono vuoti. Inserisci un link nella pagina principale e avvia lo scraping per
          popolare i campi.
        </p>
      )}

      <div style={{ marginBottom: 8 }}>
        <button
          onClick={async () => {
            try {
              const res = await fetch('/evento-tennis-completo.json');
              const j = await res.json();
              setRaw(j);
              const n = normalizeApiResponse(j);
              setNormalized(n);
              setForm({
                eventId: n._raw && n._raw.event ? n._raw.event.id : n._raw?.event?.id || '',
                homeName: n.home?.name || '',
                awayName: n.away?.name || '',
                tournament:
                  (n._raw &&
                    n._raw.event &&
                    n._raw.event.tournament &&
                    n._raw.event.tournament.name) ||
                  '',
                status:
                  (n._raw &&
                    n._raw.event &&
                    n._raw.event.status &&
                    n._raw.event.status.description) ||
                  '',
              });
            } catch (e) {
              // ignore
            }
          }}
        >
          Carica sample JSON
        </button>
      </div>

      {normalized && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>
              Event ID
              <br />
              <input
                value={form.eventId || ''}
                onChange={(e) => onChange('eventId', e.target.value)}
              />
            </label>
            <br />
            <label>
              Home
              <br />
              <input
                value={form.homeName || ''}
                onChange={(e) => onChange('homeName', e.target.value)}
              />
            </label>
            <br />
            <label>
              Away
              <br />
              <input
                value={form.awayName || ''}
                onChange={(e) => onChange('awayName', e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              Tournament
              <br />
              <input
                value={form.tournament || ''}
                onChange={(e) => onChange('tournament', e.target.value)}
              />
            </label>
            <br />
            <label>
              Status
              <br />
              <input
                value={form.status || ''}
                onChange={(e) => onChange('status', e.target.value)}
              />
            </label>
            <div style={{ marginTop: 12 }}>
              <strong>Gruppi statistiche</strong>
              <ul>
                {Array.isArray(normalized.statsAll?.groups) ? (
                  normalized.statsAll.groups.map((g, idx) => <li key={idx}>{g.groupName}</li>)
                ) : (
                  <li>Nessun gruppo</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {saved && <div style={{ marginTop: 8, color: 'green' }}>Salvato in localStorage</div>}

      <details style={{ marginTop: 12 }}>
        <summary>JSON raw</summary>
        <pre style={{ maxHeight: 300, overflow: 'auto' }}>
          {raw ? JSON.stringify(raw, null, 2) : '—'}
        </pre>
      </details>
    </div>
  );
}
