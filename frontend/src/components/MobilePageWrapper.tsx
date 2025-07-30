import React from 'react';

interface MobilePageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const MobilePageWrapper: React.FC<MobilePageWrapperProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 md:p-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
};

export default MobilePageWrapper; 