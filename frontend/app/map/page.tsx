'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { issuesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import IssueMap from '@/components/maps/IssueMap';
import { toast } from 'react-hot-toast';
import { LayoutDashboard, LogIn, PlusCircle } from 'lucide-react';

export default function UnifiedMapPage() {
  const { user, token } = useAuthStore();
  const [issues, setIssues] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (category) params.category = category;
      if (severity) params.severity = severity;
      if (status) params.status = status;
      params.per_page = 100;

      const res = await issuesApi.list(params);
      setIssues(res.data.items);
    } catch (err) {
      toast.error('Failed to load map points');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, severity, status]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1e] text-[#f0f4ff]">
      {/* Navigation Header */}
      <nav className="h-16 border-b border-white/5 bg-[#111827]/85 backdrop-blur-md flex items-center justify-between px-8 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white font-extrabold text-lg">
            <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-base">
              🦸
            </span>
            CivicLens AI
          </Link>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#06b6d4] bg-[#06b6d4]/10 border border-[#06b6d4]/20 px-2 py-0.5 rounded-full">
            Map Portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <>
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <LayoutDashboard size={14} />
                  Dashboard
                </Button>
              </Link>
              <Link href="/report">
                <Button size="sm" className="flex items-center gap-1.5">
                  <PlusCircle size={14} />
                  Report Issue
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <LogIn size={14} />
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Page Area */}
      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full flex flex-col">
        {/* Filters */}
        <Card className="p-4 flex flex-wrap gap-4 items-center justify-between shrink-0">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1 w-44">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Category</span>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                <option value="pothole">Pothole</option>
                <option value="garbage">Garbage</option>
                <option value="water_leakage">Water Leakage</option>
                <option value="streetlight">Streetlight</option>
                <option value="road_damage">Road Damage</option>
                <option value="tree_fall">Tree Fall</option>
                <option value="drainage">Drainage</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1 w-44">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Severity</span>
              <Select value={category} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1 w-44">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="reported">Reported</option>
                <option value="ai_verified">AI Verified</option>
                <option value="community_verified">Community Verified</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            Showing <span className="font-bold text-white">{issues.length}</span> active markers
          </div>
        </Card>

        {/* Map Rendering */}
        <div className="flex-1 min-h-[500px]">
          <IssueMap issues={issues} />
        </div>
      </div>
    </div>
  );
}
