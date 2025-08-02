import React from 'react';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className = ''
}) => {
  return (
    <div className={`mb-4 sm:mb-6 lg:mb-8 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 sm:p-3 bg-white rounded-xl shadow-sm border border-gray-200">
            {icon}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-gray-600">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePageHeader; 