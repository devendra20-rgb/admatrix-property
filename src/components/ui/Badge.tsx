import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'neutral', size = 'md', className = '' }: BadgeProps) {
  const variantStyles = {
    primary: 'bg-[#F0EFFF] text-[#635BFF] border border-[#D5D1FF]',
    success: 'bg-[#E7F7F0] text-[#16A36A] border border-[#B7EBD4]',
    warning: 'bg-[#FDF5E8] text-[#D97706] border border-[#FBE3B5]',
    danger: 'bg-[#FDEEEC] text-[#E05252] border border-[#F8C8C4]',
    neutral: 'bg-[#F1F3F7] text-[#4B5565] border border-[#E3E7ED]',
    outline: 'bg-transparent text-[#737B8C] border border-[#E8EAF0]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full font-medium',
    md: 'text-xs px-2.5 py-1 rounded-full font-medium',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 transition-all ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
