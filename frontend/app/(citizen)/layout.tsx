'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { usersApi } from '@/lib/api';
import { Bell, Map, LayoutDashboard, PlusCircle, User, LogOut, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token && mounted) {
      router.push('/login');
      return;
    }

    if (token && mounted) {
      // Fetch unread notifications count
      const fetchNotifications = async () => {
        try {
          const res = await usersApi.notifications(true);
          setUnreadCount(res.data.length);
        } catch (err) {
          // Silent fail
        }
      };

      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [token, router, mounted]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-gray-500">
        Syncing Citizen Portal...
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Report Problem', path: '/report', icon: PlusCircle },
    { name: 'Interactive Map', path: '/map', icon: Map },
    { name: 'My Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex bg-[#0a0f1e]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#111827]/80 backdrop-blur-md flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-xl">
            🦸
          </div>
          <span className="font-bold text-lg text-white">CivicLens AI</span>
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
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="pt-6 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400 border border-blue-500/30">
              {user.full_name?.charAt(0).toUpperCase() || 'H'}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm text-white truncate">{user.full_name || 'Hero User'}</div>
              <div className="text-xs text-gray-400 truncate">{user.email || 'Anonymous'}</div>
            </div>
          </div>

          {['government', 'admin'].includes(user.role) && (
            <Link
              href="/government/dashboard"
              className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 mb-4 px-2"
            >
              <ShieldAlert size={14} />
              Switch to Officer view
            </Link>
          )}

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
        <header className="h-16 border-b border-white/5 bg-[#111827]/40 backdrop-blur-md flex items-center justify-between px-8">
          <div className="font-semibold text-white">
            {pathname === '/dashboard' && 'Welcome Back, Citizen Hero'}
            {pathname === '/report' && 'Report New Civic Problem'}
            {pathname === '/map' && 'Hyperlocal Map Portal'}
            {pathname === '/profile' && 'Citizen Reward Profile'}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/profile" className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 text-xs font-bold text-blue-400">
              🏆 {user.points} Points
            </Link>

            <Link href="/notifications" className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && <span className="notif-dot" />}
            </Link>
          </div>
        </header>

        {/* Page children */}
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
