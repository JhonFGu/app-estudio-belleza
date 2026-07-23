import React from 'react';

export type StatTone = 'mint' | 'pink' | 'peach' | 'sky' | 'lavender';

interface StatCardProps {
  tone?: StatTone;
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  trend?: React.ReactNode;
}

const TONE_STYLES: Record<StatTone, { card: string; icon: string }> = {
  mint: { card: 'bg-app-mint-50', icon: 'bg-white text-app-mint' },
  pink: { card: 'bg-app-pink-50', icon: 'bg-white text-app-pink' },
  peach: { card: 'bg-app-peach-50', icon: 'bg-white text-app-peach' },
  sky: { card: 'bg-app-sky-50', icon: 'bg-white text-app-sky' },
  lavender: { card: 'bg-app-lavender-50', icon: 'bg-white text-app-lavender' },
};

export const StatCard: React.FC<StatCardProps> = ({
  tone = 'mint',
  icon,
  label,
  value,
  sublabel,
  trend,
}) => {
  const styles = TONE_STYLES[tone];

  return (
    <div className={`${styles.card} rounded-2xl p-5 border border-white shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-extrabold uppercase tracking-wider text-app-text-secondary">
            {label}
          </p>
          <p className="text-xl font-extrabold text-app-text-primary tracking-tight mt-1.5 truncate">
            {value}
          </p>
          {sublabel && (
            <p className="text-2xs font-semibold text-app-text-muted mt-1 uppercase tracking-wide">
              {sublabel}
            </p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center flex-shrink-0 shadow-sm [&>svg]:w-5 [&>svg]:h-5`}
        >
          {icon}
        </div>
      </div>
      {trend && <div className="mt-3">{trend}</div>}
    </div>
  );
};
