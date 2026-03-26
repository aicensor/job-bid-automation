interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const color = score >= 85 ? 'bg-green-100 text-green-800' :
                score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800';

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' :
                    size === 'lg' ? 'text-lg px-4 py-2 font-bold' :
                                    'text-sm px-2.5 py-1 font-semibold';

  return (
    <span className={`inline-flex items-center rounded-full ${color} ${sizeClass}`}>
      {score}
    </span>
  );
}
