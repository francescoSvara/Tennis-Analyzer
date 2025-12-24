/**
 * LoadingSkeleton - Stato di caricamento
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md (UI States)
 */

import React from 'react';
import { motion } from 'framer-motion';
import './LoadingSkeleton.css';

/**
 * Skeleton element base
 */
function SkeletonBox({ width, height, className = '', style = {} }) {
  return (
    <motion.div
      className={`skeleton-box ${className}`}
      style={{ width, height, ...style }}
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

/**
 * LoadingSkeleton Component
 */
export function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      {/* Header Skeleton */}
      <div className="skeleton-header">
        <div className="skeleton-header__left">
          <SkeletonBox width={36} height={36} className="rounded" />
          <div className="skeleton-info">
            <SkeletonBox width={200} height={20} />
            <SkeletonBox width={150} height={14} />
          </div>
        </div>
        <div className="skeleton-header__center">
          <SkeletonBox width={180} height={50} className="rounded" />
          <SkeletonBox width={120} height={30} className="rounded" />
        </div>
        <div className="skeleton-header__right">
          <SkeletonBox width={100} height={24} />
          <div className="skeleton-actions">
            <SkeletonBox width={36} height={36} className="rounded" />
            <SkeletonBox width={36} height={36} className="rounded" />
            <SkeletonBox width={36} height={36} className="rounded" />
          </div>
        </div>
      </div>

      {/* Layout Skeleton */}
      <div className="skeleton-layout">
        {/* Sidebar */}
        <div className="skeleton-sidebar">
          {[...Array(8)].map((_, i) => (
            <SkeletonBox key={i} width="100%" height={44} className="rounded" />
          ))}
        </div>

        {/* Main Content */}
        <div className="skeleton-main">
          <div className="skeleton-content">
            {/* Cards */}
            <div className="skeleton-cards">
              <SkeletonBox width="100%" height={200} className="rounded-lg" />
              <div className="skeleton-cards-row">
                <SkeletonBox width="48%" height={150} className="rounded-lg" />
                <SkeletonBox width="48%" height={150} className="rounded-lg" />
              </div>
              <SkeletonBox width="100%" height={120} className="rounded-lg" />
            </div>
          </div>
        </div>

        {/* Right Rail */}
        <div className="skeleton-rail">
          <SkeletonBox width="100%" height={180} className="rounded-lg" />
          <SkeletonBox width="100%" height={120} className="rounded-lg" />
          <SkeletonBox width="100%" height={150} className="rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default LoadingSkeleton;
