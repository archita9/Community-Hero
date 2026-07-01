'use client';
import { useEffect, useState } from 'react';
import { issuesApi, deptApi, analyticsApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Download, RefreshCw, Layers } from 'lucide-react';

export default function AdminPanelPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [deptRes, listRes] = await Promise.all([
        deptApi.list(),
        issuesApi.list({ per_page: 50 }),
      ]);
      setDepartments(deptRes.data);
      setIssues(listRes.data.items);
    } catch (err) {
      toast.error('Failed to load admin panel data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleExportCSV = () => {
    if (issues.length === 0) {
      toast.error('No issues to export');
      return;
    }
    // Simple CSV conversion
    const headers = ['Issue Number', 'Title', 'Category', 'Severity', 'Status', 'Priority', 'Latitude', 'Longitude', 'Created At'];
    const rows = issues.map((i) => [
      i.issue_number,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.severity,
      i.status,
      i.priority_score,
      i.latitude,
      i.longitude,
      i.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivicLens_AI_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Export downloaded successfully!');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Administrative Portal</h2>
          <p className="text-xs text-gray-400">Configure departments, export records, and oversee overall operations.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-blue-600 border-transparent text-white hover:bg-blue-700 transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={fetchAdminData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Departments configuration */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              <CardTitle className="text-base font-bold">Configured Departments ({departments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)
              ) : (
                departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="p-4 rounded-xl border border-white/5 bg-white/5 flex justify-between items-center gap-4 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="text-lg">{dept.icon}</span>
                        {dept.name} ({dept.code})
                      </div>
                      <p className="text-gray-400 mt-1">{dept.description}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {dept.handles_categories.map((cat: string) => (
                          <Badge key={cat} variant="outline" className="text-[9px] capitalize">
                            {cat.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-400 border border-green-500/20">Active</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: general system parameters */}
        <Card className="p-6 h-fit">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-3">System Constants</span>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400">Duplicate Radius</span>
              <span className="font-semibold text-white">100m</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400">Base Matching Limit</span>
              <span className="font-semibold text-white">80% similarity</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400">Active Wards</span>
              <span className="font-semibold text-white">Sector-4 Control</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400">AI Pipelines</span>
              <span className="font-semibold text-green-400">Online</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
