'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { BarChart3, ShieldAlert, ClipboardList, Map, LogOut, User2, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function GovLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token && mounted) {
      router.push('/login');
      return;
    }
    if (user && !['government', 'admin'].includes(user.role) && mounted) {
      toast.error('Access Denied. Government credentials required.');
      router.push('/dashboard');
    }
  }, [token, user, router, mounted]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#060b13] flex items-center justify-center text-gray-500">
        Syncing Government Portal...
      </div>
    );
  }

  if (!user || !['government', 'admin'].includes(user.role)) return null;

  const navItems = [
    { name: 'Officer Dashboard', path: '/government/dashboard', icon: BarChart3 },
    { name: 'Open Issues Queue', path: '/government/issues', icon: ClipboardList },
    { name: 'Ward Heatmaps', path: '/government/analytics', icon: Map },
    { name: 'Predictive Audits', path: '/government/predictive', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen flex bg-[#060b13]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0e1622]/90 backdrop-blur-md flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-xl">
            🏛️
          </div>
          <span className="font-bold text-lg text-white">Gov Portal</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom card */}
        <div className="pt-6 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-400 border border-amber-500/30">
              {user.full_name?.charAt(0).toUpperCase() || 'O'}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm text-white truncate">{user.full_name || 'Officer'}</div>
              <div className="text-xs text-amber-400 truncate uppercase font-bold">{user.role}</div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 mb-4 px-2"
          >
            <Eye size={14} />
            Switch to Citizen view
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-[#0e1622]/40 backdrop-blur-md flex items-center justify-between px-8">
          <div className="font-semibold text-white">
            {pathname === '/government/dashboard' && 'Civic Control & KPI Center'}
            {pathname === '/government/issues' && 'Active Issue Escalation Queue'}
            {pathname === '/government/analytics' && 'Geospatial Ward Heatmaps'}
            {pathname === '/government/predictive' && 'Predictive Maintenance Insights'}
          </div>
          <div className="text-xs font-bold text-gray-400 border border-white/10 px-3 py-1.5 rounded-full bg-white/5">
            🌍 Ward Control: Sector-4
          </div>
        </header>

        {/* Dashboard contents */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
