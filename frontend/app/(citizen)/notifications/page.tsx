'use client';
import { useEffect, useState } from 'react';
import Link from 'next/navigation';
import { usersApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Bell, BellOff, CheckCheck } from 'lucide-react';

export default function CitizenNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await usersApi.notifications();
      setNotifications(res.data);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await usersApi.markRead();
      toast.success('All notifications marked as read!');
      fetchNotifications();
    } catch (err) {
      toast.error('Action failed.');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={20} className="text-blue-400" />
          Alert Center
        </h2>
        {notifications.some((n) => !n.is_read) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="flex items-center gap-1">
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500 space-y-2 flex flex-col items-center">
              <BellOff size={32} className="text-gray-600" />
              <div className="text-sm font-semibold">No notifications yet.</div>
              <p className="text-xs text-gray-400 max-w-xs">We will alert you here as issues you reported update stages.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-all flex justify-between gap-4 items-start ${
                  notif.is_read
                    ? 'border-white/5 bg-white/5 opacity-60'
                    : 'border-blue-500/20 bg-blue-500/5'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    {notif.title}
                    {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />}
                  </div>
                  <p className="text-xs text-gray-300">{notif.message}</p>
                  <span className="text-[9px] text-gray-500 block">{new Date(notif.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
