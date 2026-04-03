import UserTable from '@/components/admin/UserTable';

export default function AdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">Approve, disable, and manage bidman accounts</p>
      </div>
      <UserTable />
    </div>
  );
}
