import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wrench, LayoutDashboard, ClipboardList, LogOut } from 'lucide-react';

const navItems = [
  { path: '/garage/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/garage/claims', label: 'Claims', icon: ClipboardList },
];

export function GarageLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('garageToken');
    localStorage.removeItem('garageUser');
    navigate('/garage/login');
  };

  const garageName = (() => {
    try {
      const raw = localStorage.getItem('garageUser');
      if (raw) { const g = JSON.parse(raw); return g.name; }
    } catch { /* ignore */ }
    return 'Garage';
  })();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Wrench className="h-8 w-8 text-orange-400" />
            <div>
              <h1 className="text-lg font-bold text-white">Flash Claim</h1>
              <p className="text-xs text-gray-400">Garage Portal</p>
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
                  isActive ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 px-3 mb-2 truncate">{garageName}</p>
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
