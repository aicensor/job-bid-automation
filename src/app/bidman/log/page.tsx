import LogTable from '@/components/bidman/LogTable';
import EmptyState from '@/components/shared/EmptyState';
import { getLogEntries } from '@/lib/bidman-log';

export default function BidmanLogPage() {
  const entries = getLogEntries();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tailor Log</h1>
        <p className="text-sm text-gray-500 mt-1">History of all tailored resumes from Bidman</p>
      </div>

      {entries.length > 0 ? (
        <LogTable />
      ) : (
        <EmptyState
          icon="&#x1F4D1;"
          title="No logs yet"
          description="Tailor logs will appear here after you complete your first bid."
        />
      )}
    </div>
  );
}
