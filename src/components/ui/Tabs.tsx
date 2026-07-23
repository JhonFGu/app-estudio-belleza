import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                isActive
                  ? 'bg-app-mint text-white shadow-sm'
                  : 'bg-white border border-app-gray-200 text-app-text-secondary hover:border-app-gray-300 hover:text-app-text-primary'
              }`}
            >
              {tab.icon && <span className="[&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
