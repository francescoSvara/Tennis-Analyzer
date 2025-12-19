import React from 'react';
import styles from '../styles/statistics.module.css';
import { parseNumericValue, getStatHighlightClasses } from '../utils';

export default function StatRow({ item }) {
  const homeRaw = item.homeValue ?? item.home;
  const awayRaw = item.awayValue ?? item.away;
  const homeVal = parseNumericValue(homeRaw);
  const awayVal = parseNumericValue(awayRaw);

  const { homeKey, awayKey } = getStatHighlightClasses(item);

  return (
    <tr>
      <td className={styles.statName}>{item.name ?? item.statName ?? ''}</td>
      <td className={homeKey ? styles[homeKey] : undefined}>
        {item.home ?? item.homeValue ?? '-'}
      </td>
      <td className={awayKey ? styles[awayKey] : undefined}>
        {item.away ?? item.awayValue ?? '-'}
      </td>
    </tr>
  );
}
