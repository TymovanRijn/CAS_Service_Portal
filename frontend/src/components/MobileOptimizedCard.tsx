import React from 'react';

interface MobileOptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

export const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default',
  size = 'md'
}) => {
  const baseClasses = 'card-interactive touch-manipulation select-none';
  
  const variantClasses = {
    default: 'bg-white border border-gray-200 hover:border-gray-300',
    elevated: 'bg-white shadow-md hover:shadow-lg border-0',
    outlined: 'bg-transparent border-2 border-gray-200 hover:border-gray-300'
  };

  const sizeClasses = {
    sm: 'p-3 rounded-lg',
    md: 'p-4 rounded-xl',
    lg: 'p-6 rounded-2xl'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].join(' ');

  return (
    <div 
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default MobileOptimizedCard; 