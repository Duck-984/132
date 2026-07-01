interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full' | 'text';
  className?: string;
}

const sizes = {
  sm: { icon: 28, text: 'text-sm', sub: false },
  md: { icon: 36, text: 'text-base', sub: true },
  lg: { icon: 48, text: 'text-xl', sub: true },
  xl: { icon: 64, text: 'text-2xl', sub: true },
};

export const Logo = ({ size = 'md', variant = 'full', className = '' }: LogoProps) => {
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ width: s.icon, height: s.icon }}
      >
        <svg
          width={s.icon * 0.52}
          height={s.icon * 0.52}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"

        >
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      </div>
      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight text-surface-900 dark:text-white ${s.text}`}>
            KUPI
          </span>
          {s.sub && (
            <span className="text-2xs font-medium text-surface-400 dark:text-surface-500 tracking-widest uppercase mt-0.5">
              Market
            </span>
          )}
        </div>
      )}
    </div>
  );
};
