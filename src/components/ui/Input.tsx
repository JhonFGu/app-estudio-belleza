import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
}

export const inputBaseClass =
  'w-full px-3.5 py-2.5 border border-app-gray-200 rounded-xl text-sm font-medium text-app-text-primary bg-white outline-none focus:border-app-mint focus:ring-2 focus:ring-app-mint-100 transition-all placeholder:text-app-gray-500';

export const labelBaseClass =
  'text-2xs font-extrabold uppercase tracking-wider text-app-text-secondary mb-1.5 block';

export const Input: React.FC<InputProps> = ({ icon, label, className = '', id, ...props }) => {
  const inputEl = icon ? (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-gray-500 [&>svg]:w-4 [&>svg]:h-4 pointer-events-none">
        {icon}
      </span>
      <input id={id} className={`${inputBaseClass} pl-10 ${className}`} {...props} />
    </div>
  ) : (
    <input id={id} className={`${inputBaseClass} ${className}`} {...props} />
  );

  if (!label) return inputEl;

  return (
    <div>
      <label htmlFor={id} className={labelBaseClass}>
        {label}
      </label>
      {inputEl}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  placeholder,
  className = '',
  id,
  ...props
}) => {
  const selectEl = (
    <select
      id={id}
      className={`${inputBaseClass} cursor-pointer ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (!label) return selectEl;

  return (
    <div>
      <label htmlFor={id} className={labelBaseClass}>
        {label}
      </label>
      {selectEl}
    </div>
  );
};
