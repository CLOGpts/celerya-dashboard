
import React from 'react';

export const SortIcon: React.FC<{
  className?: string;
  direction: 'ascending' | 'descending' | null;
}> = ({ className, direction }) => {
  return (
    <span className={`inline-flex flex-col items-center justify-center w-4 h-4 ${className}`}>
      <svg className={`h-[6px] w-[6px] mb-0.5 ${direction === 'ascending' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-500'}`} fill="currentColor" viewBox="0 0 8 8">
        <path d="M4 0L0 4h8L4 0z"></path>
      </svg>
      <svg className={`h-[6px] w-[6px] ${direction === 'descending' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-500'}`} fill="currentColor" viewBox="0 0 8 8">
        <path d="M4 8L0 4h8L4 8z"></path>
      </svg>
    </span>
  );
};