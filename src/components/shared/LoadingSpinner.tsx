interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClass} border-2 border-gray-200 border-t-primary rounded-full animate-spin`} />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  );
}
