interface StatsData {
  totalRuns: number;
  avgImprovement: number;
  bestScore: number;
}

export default function QuickStats({ totalRuns, avgImprovement, bestScore }: StatsData) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">Total Tailored</p>
        <p className="text-3xl font-bold text-gray-900">{totalRuns}</p>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">Avg Improvement</p>
        <p className="text-3xl font-bold text-blue-600">+{avgImprovement}</p>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">Best Score</p>
        <p className="text-3xl font-bold text-green-600">{bestScore}</p>
      </div>
    </div>
  );
}
