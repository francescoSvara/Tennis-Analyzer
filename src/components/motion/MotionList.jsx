/**
 * MotionList - Container per liste animate con stagger
 */
import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { staggerContainer, staggerItem, durations, easings, reducedMotionFade } from '../../motion/tokens';

// Container per liste con stagger animation
export const MotionListContainer = React.forwardRef(({
  children,
  className = '',
  as = 'div',
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();
  const Component = motion[as] || motion.div;
  
  return (
    <Component
      ref={ref}
      className={className}
      variants={prefersReducedMotion ? {} : staggerContainer}
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    >
      {children}
    </Component>
  );
});

MotionListContainer.displayName = 'MotionListContainer';

// Item per liste con animazione
export const MotionListItem = React.forwardRef(({
  children,
  className = '',
  as = 'div',
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();
  const Component = motion[as] || motion.div;
  
  return (
    <Component
      ref={ref}
      className={className}
      variants={prefersReducedMotion ? reducedMotionFade : staggerItem}
      transition={{
        duration: durations.normal,
        ease: easings.premium,
      }}
      {...props}
    >
      {children}
    </Component>
  );
});

MotionListItem.displayName = 'MotionListItem';

// Wrapper completo con AnimatePresence
const MotionList = ({ children, className = '', ...props }) => {
  return (
    <AnimatePresence mode="popLayout">
      <MotionListContainer className={className} {...props}>
        {children}
      </MotionListContainer>
    </AnimatePresence>
  );
};

export default MotionList;
