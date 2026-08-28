import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, ClipboardList, FileText, LogOut } from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/claims', label: 'Claims', icon: ClipboardList },
  { path: '/admin/documents', label: 'Documents', icon: FileText },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const adminName = (() => {
    try {
      const raw = localStorage.getItem('adminUser');
      if (raw) { const u = JSON.parse(raw); return `${u.firstName} ${u.lastName}`; }
    } catch { /* ignore */ }
    return 'Admin';
  })();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary-400" />
            <div>
              <h1 className="text-lg font-bold text-white">AutoShield AI</h1>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 px-3 mb-2 truncate">{adminName}</p>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
