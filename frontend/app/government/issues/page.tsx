'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { issuesApi } from '@/lib/api';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function GovIssuesListPage() {
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
      params.per_page = 50;

      const res = await issuesApi.list(params);
      setIssues(res.data.items);
    } catch (err) {
      toast.error('Failed to load issues list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, severity, status]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-4 items-center justify-between">
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
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
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
          Showing <span className="font-bold text-white">{issues.length}</span> active queue items
        </div>
      </Card>

      {/* Table grid */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Issue Code</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="h-12 skeleton" />)
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No issues found matching filters.</td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-bold text-blue-400">{issue.priority_score}</td>
                    <td className="py-3 px-4 font-mono text-gray-300">{issue.issue_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white truncate max-w-[250px]">{issue.title}</div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[250px]">{issue.address}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={issue.severity === 'critical' ? 'destructive' : 'default'} className="capitalize">
                        {issue.severity}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-bold text-gray-300">{issue.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/government/issues/${issue.id}`}>
                        <Button size="sm" variant="outline" className="h-8 px-3 gap-1">
                          Manage <ChevronRight size={12} />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
