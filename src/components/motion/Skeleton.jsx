/**
 * Skeleton - Componente per loading state elegante
 * Shimmer animation leggera
 */
import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/skeleton.css';

// Skeleton base con shimmer
const Skeleton = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '6px',
  className = '',
  variant = 'default' // 'default' | 'text' | 'circle' | 'card'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return { height: '1em', borderRadius: '4px' };
      case 'circle':
        return { 
          width: height, 
          height, 
          borderRadius: '50%' 
        };
      case 'card':
        return { 
          height: height || '200px', 
          borderRadius: '12px' 
        };
      default:
        return { height, borderRadius };
    }
  };

  return (
    <div 
      className={`skeleton ${className}`}
      style={{
        width,
        ...getVariantStyles(),
      }}
    />
  );
};

// Skeleton per una card match
export const MatchCardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-card-header">
      <Skeleton width="60px" height="18px" />
      <Skeleton width="80px" height="18px" />
    </div>
    <Skeleton width="70%" height="16px" className="skeleton-mt" />
    <div className="skeleton-teams">
      <div className="skeleton-team">
        <Skeleton variant="circle" height="24px" />
        <Skeleton width="120px" height="16px" />
      </div>
      <Skeleton width="30px" height="20px" className="skeleton-vs" />
      <div className="skeleton-team">
        <Skeleton variant="circle" height="24px" />
        <Skeleton width="120px" height="16px" />
      </div>
    </div>
    <div className="skeleton-footer">
      <Skeleton width="80px" height="24px" borderRadius="12px" />
    </div>
  </div>
);

// Griglia di skeleton cards
export const MatchGridSkeleton = ({ count = 6 }) => (
  <div className="skeleton-grid">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.05 }}
      >
        <MatchCardSkeleton />
      </motion.div>
    ))}
  </div>
);

// Skeleton per sidebar
export const SidebarSkeleton = () => (
  <div className="skeleton-sidebar">
    <Skeleton width="100px" height="14px" className="skeleton-mb" />
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="skeleton-sidebar-item">
        <Skeleton variant="circle" height="20px" />
        <Skeleton width="80px" height="16px" />
      </div>
    ))}
  </div>
);

export default Skeleton;
