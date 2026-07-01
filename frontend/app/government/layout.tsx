'use client';
import { useEffect, useState } from 'react';
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

  if (!user) return null;

  const navItems = [
    { name: 'Analytics Board', path: '/government/analytics', icon: BarChart3 },
    { name: 'Issue Queue', path: '/government/issues', icon: ClipboardList },
    { name: 'Predictive ML', path: '/government/predictive', icon: ShieldAlert },
    { name: 'Live Mapping', path: '/map', icon: Map },
  ];

  return (
    <div className="min-h-screen flex bg-[#060b13]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0f18]/80 backdrop-blur-md flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-xl">
            🏛️
          </div>
          <span className="font-bold text-lg text-white">Gov Control</span>
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
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
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
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center font-bold text-blue-400 border border-blue-600/30">
              {user.full_name?.charAt(0).toUpperCase() || 'O'}
            </div>
            <div>
              <div className="font-semibold text-sm text-white truncate">{user.full_name || 'Officer'}</div>
              <div className="text-xs text-gray-400 truncate">{user.email || 'Dept Officer'}</div>
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
        <main className="flex-1 overflow-y-auto p-8 flex flex-col justify-between">
          <div className="flex-1 pb-12">{children}</div>
          <footer className="border-t border-white/5 pt-6 mt-12 text-center text-xs text-gray-500">
            <p className="font-semibold text-gray-400 mb-1">
              Community Hero &copy; 2026. Developed and Maintained by <span className="text-blue-400 font-bold">Archita Goyal</span>.
            </p>
            <p>All Rights Reserved. Empowering Hyperlocal Public Resolution.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
