import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, ClipboardList, FileText, LogOut, Wrench, ChevronLeft, ChevronRight, Car, ShieldCheck } from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { path: '/admin/claims', label: 'Claims', icon: ClipboardList },
  { path: '/admin/policies', label: 'Policies', icon: ShieldCheck },
  { path: '/admin/documents', label: 'Documents', icon: FileText },
  { path: '/admin/garages', label: 'Garages', icon: Wrench },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

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

  const sidebarW = collapsed ? 'w-16' : 'w-56';
  const mainML = collapsed ? 'ml-16' : 'ml-56';

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`${sidebarW} bg-gray-900 flex flex-col fixed h-full transition-all duration-200 z-20`}>
        {/* Logo / collapse toggle */}
        <div className={`flex items-center border-b border-gray-700 ${collapsed ? 'justify-center py-4 px-2' : 'justify-between p-4'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="h-7 w-7 text-primary-400 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white leading-tight">Flash Claim</h1>
                <p className="text-[10px] text-gray-400">Admin Panel</p>
              </div>
            </div>
          )}
          {collapsed && <Shield className="h-7 w-7 text-primary-400" />}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}>
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-2 border-t border-gray-700 ${collapsed ? '' : 'px-3'}`}>
          {!collapsed && <p className="text-xs text-gray-500 px-2 mb-2 truncate">{adminName}</p>}
          <button onClick={handleLogout} title={collapsed ? 'Sign Out' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors ${collapsed ? 'justify-center' : ''}`}>
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${mainML} transition-all duration-200 min-w-0`}>
        <div className="p-4 lg:p-6 overflow-x-auto">{children}</div>
      </main>
    </div>
  );
}
