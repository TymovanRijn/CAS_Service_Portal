import React from 'react';

interface MobileInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'filled';
  error?: boolean;
  errorMessage?: string;
  label?: string;
  fullWidth?: boolean;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  required = false,
  name,
  id,
  className = '',
  size = 'md',
  variant = 'default',
  error = false,
  errorMessage,
  label,
  fullWidth = false
}) => {
  const baseClasses = 'mobile-input touch-manipulation transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0';
  
  const variantClasses = {
    default: 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    outlined: 'border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    filled: 'border-0 bg-gray-100 focus:bg-white focus:ring-blue-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-lg min-h-[40px]',
    md: 'px-4 py-3 text-base rounded-xl min-h-[48px]',
    lg: 'px-5 py-4 text-lg rounded-2xl min-h-[56px]'
  };

  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : '';
  const widthClasses = fullWidth ? 'w-full' : '';

  const inputClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    errorClasses,
    disabledClasses,
    widthClasses,
    className
  ].join(' ');

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        name={name}
        id={id}
        className={inputClasses}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};

export default MobileInput; 