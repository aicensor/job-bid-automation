interface Change {
  section: string;
  type: string;
  description: string;
}

export default function ChangesList({ changes }: { changes: Change[] }) {
  if (!changes || changes.length === 0) return null;

  const typeColors: Record<string, string> = {
    rewrite: 'bg-blue-100 text-blue-700',
    inject: 'bg-green-100 text-green-700',
    reorder: 'bg-purple-100 text-purple-700',
    remove: 'bg-red-100 text-red-700',
    add: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Changes Made ({changes.length})</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {changes.map((change, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${typeColors[change.type] || 'bg-gray-100 text-gray-700'}`}>
              {change.type}
            </span>
            <span className="text-gray-500 shrink-0 w-24">{change.section}</span>
            <span className="text-gray-700">{change.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
