'use client';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Sparkles, BarChart3, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

export default function GovAnalyticsPage() {
  const [wardStats, setWardStats] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [wardRes, aiRes] = await Promise.all([
        analyticsApi.wardStats(),
        analyticsApi.aiInsights(),
      ]);
      setWardStats(wardRes.data);
      setInsights(aiRes.data.insights || []);
      setPredictions(aiRes.data.predictions || []);
    } catch (err) {
      toast.error('Failed to load analytics dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Geospatial Ward Insights</h2>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="flex items-center gap-1">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ward breakdown list */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 size={18} />
                Ward-Wise Complaint Volumes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                [...Array(4)].map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)
              ) : wardStats.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">No ward data available.</div>
              ) : (
                wardStats.map((ward, idx) => {
                  const rate = ward.total > 0 ? Math.round((ward.resolved / ward.total) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1.5 p-3 rounded-xl border border-white/5 bg-white/5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white capitalize">{ward.ward || `Sector ${idx + 1}`}</span>
                        <span className="text-gray-400 font-semibold">
                          {ward.resolved}/{ward.total} Resolved ({rate}%)
                        </span>
                      </div>
                      {/* Bar indicator */}
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* AI Insights banner */}
          <Card className="gradient-card border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles size={18} className="text-blue-400" />
                AI Control Center Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                [...Array(2)].map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)
              ) : insights.length === 0 ? (
                <div className="text-xs text-gray-500 italic p-3 border border-dashed border-white/10 rounded-xl">
                  AI: &ldquo;Gathering historical pattern data to generate insights...&rdquo; (Check database seed settings).
                </div>
              ) : (
                insights.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <Badge variant="default" className="text-[9px] uppercase tracking-wider">{item.category}</Badge>
                      <Badge variant={item.priority === 'high' ? 'destructive' : 'default'} className="text-[9px]">{item.priority} Priority</Badge>
                    </div>
                    <p className="text-gray-200 mt-1 font-semibold">{item.insight}</p>
                    <p className="text-gray-400 mt-1">Recommended Action: {item.action}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side predictions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Predictive Maintenance Audits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {loading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)
              ) : predictions.length === 0 ? (
                <div className="text-xs text-gray-500 italic">No predictions generated yet. Run issues to feed ML pipeline.</div>
              ) : (
                predictions.map((pred, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white capitalize">{pred.location}</span>
                      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                        {(pred.probability * 100).toFixed(0)}% Risk
                      </Badge>
                    </div>
                    <div className="text-gray-300 font-semibold">{pred.prediction}</div>
                    <div className="text-[10px] text-gray-500">Timeframe: {pred.timeframe} · Basis: {pred.basis}</div>
                    <div className="border-t border-white/5 pt-2 mt-1 text-[10px] text-green-400">
                      Proactive Action: {pred.recommended_action}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Stub button mock import
function Button({ children, variant, size, onClick, className }: any) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
        variant === 'outline'
          ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
          : 'bg-blue-600 border-transparent text-white hover:bg-blue-700'
      } ${className}`}
    >
      {children}
    </button>
  );
}
