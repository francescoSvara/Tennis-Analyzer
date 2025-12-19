import React, { useEffect, useState } from 'react';
import { extractPointByPoint } from '../utils/extractPointByPoint';

export default function PointByPointWidget() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/evento-tennis-completo.json')
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        const s = extractPointByPoint(d);
        setSets(s);
      })
      .catch(() => {
        if (!mounted) return;
        setSets([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (!sets || sets.length === 0) return null;

  return (
    <div className="pbp-widget">
      {sets.map((s) => (
        <section key={s.setNumber} className="pbp-set">
          <h3>Set {s.setNumber}</h3>
          {s.games.map((g) => (
            <div key={g.gameNumber} className="pbp-game">
              <strong>Game {g.gameNumber}</strong>
              <div>
                Score: {g.score.homeScore ?? '-'} - {g.score.awayScore ?? '-'}
              </div>
              <ul>
                {g.points.map((p, i) => (
                  <li key={i}>
                    {p.homePoint ?? '-'} — {p.awayPoint ?? '-'} (h:{p.homePointType ?? ''}, a:
                    {p.awayPointType ?? ''})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
