import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-app-gray-100 text-app-gray-500 flex items-center justify-center mb-4 [&>svg]:w-8 [&>svg]:h-8">
        {icon}
      </div>
      <h3 className="text-base font-bold text-app-text-primary">{title}</h3>
      {message && (
        <p className="text-sm text-app-text-secondary font-medium mt-1.5 max-w-sm">{message}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
