import React from 'react';
import StatRow from './StatRow';
import styles from '../styles/statistics.module.css';

export default function StatGroup({ group }) {
  // Support both old format (statisticsItems) and new normalized format (items)
  const items = group.items || group.statisticsItems || [];
  
  if (!items.length) return null;
  
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{group.groupName}</h2>
      <table className={styles.statsTable}>
        <thead>
          <tr>
            <th>Statistica</th>
            <th>Home</th>
            <th>Away</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => <StatRow key={idx} item={it} />)}
        </tbody>
      </table>
    </section>
  );
}
