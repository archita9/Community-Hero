'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { issuesApi, deptApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function GovDashboard() {
  const user = useAuthStore((s) => s.user);
  const [issues, setIssues] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGovData = async () => {
      try {
        const [statsRes, listRes] = await Promise.all([
          issuesApi.liveStats(),
          issuesApi.list({ per_page: 20, sort_by: 'priority_score' }), // Sort by priority score first!
        ]);
        setLiveStats(statsRes.data);
        setIssues(listRes.data.items);
      } catch (err) {
        toast.error('Failed to load control center metrics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGovData();
  }, []);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical': return <Badge variant="destructive" className="animate-pulse-glow">Critical</Badge>;
      case 'high': return <Badge variant="warning">High</Badge>;
      case 'medium': return <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20">Medium</Badge>;
      default: return <Badge variant="secondary">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Banner KPIs */}
      {liveStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Unassigned Queue</span>
              <span className="text-3xl font-black text-amber-500 mt-1">{liveStats.pending}</span>
            </div>
            <AlertCircle size={28} className="text-amber-500/80" />
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Active Emergencies</span>
              <span className="text-3xl font-black text-red-500 mt-1">{liveStats.critical}</span>
            </div>
            <Activity size={28} className="text-red-500/80 animate-pulse-glow" />
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Resolved & Verified</span>
              <span className="text-3xl font-black text-green-500 mt-1">{liveStats.resolved}</span>
            </div>
            <CheckCircle2 size={28} className="text-green-500/80" />
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">KPI Response Rate</span>
              <span className="text-3xl font-black text-cyan-500 mt-1">{liveStats.resolution_rate}%</span>
            </div>
            <Clock size={28} className="text-cyan-500/80" />
          </Card>
        </div>
      )}

      {/* Priority Queue Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">Officer Priority Queue</CardTitle>
            <p className="text-xs text-gray-400">Issues sorted by live dynamic priority score (severity + duplicate clusters + proximity).</p>
          </div>
          <Link href="/government/issues">
            <Button size="sm" variant="outline">View Full List</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Issue Code</th>
                  <th className="py-3 px-4">Problem details</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="h-12 skeleton" />
                  ))
                ) : issues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">No issues found in queue.</td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-white/[0.02] transition-all">
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                          {issue.priority_score}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-gray-300">{issue.issue_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white truncate max-w-[200px]">{issue.title}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{issue.address || 'GPS Location'}</div>
                      </td>
                      <td className="py-3 px-4">{getSeverityBadge(issue.severity)}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-bold text-gray-400">{issue.status.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/government/issues/${issue.id}`}>
                          <Button size="sm" variant="outline" className="h-8 px-3 text-[11px] gap-1">
                            Action <ChevronRight size={12} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
