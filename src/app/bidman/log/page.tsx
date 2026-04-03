import LogTable from '@/components/bidman/LogTable';
import EmptyState from '@/components/shared/EmptyState';

export default function BidmanLogPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tailor Log</h1>
        <p className="text-sm text-gray-500 mt-1">Your tailored resume history</p>
      </div>
      <LogTable />
    </div>
  );
}
