'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export default function PredictiveMaintenancePage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.aiInsights();
      setPredictions(res.data.predictions || []);
    } catch (err) {
      toast.error('Failed to load predictive maintenance metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Proactive Infrastructure Audits</h2>
          <p className="text-xs text-gray-400">AI predicts municipal asset degradation to prevent citizen complaints before they occur.</p>
        </div>
        <button
          onClick={fetchPredictions}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={14} /> Refresh Forecasts
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => <Card key={i} className="h-60 skeleton" />)
        ) : predictions.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-500 text-sm">
            No predictive maintenance insights available. Build issues history to run predictions.
          </div>
        ) : (
          predictions.map((pred, idx) => (
            <Card key={idx} className="flex flex-col justify-between p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] capitalize font-bold text-blue-400 border-blue-400/25">
                    {pred.category} Risk
                  </Badge>
                  <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-extrabold">
                    {(pred.probability * 100).toFixed(0)}% Match
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white leading-tight capitalize">{pred.location}</h3>
                <p className="text-xs text-gray-300 leading-relaxed">{pred.prediction}</p>
                <div className="text-[10px] text-gray-500">
                  <span className="font-semibold block text-gray-400">Pattern Basis:</span>
                  {pred.basis}
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-4 space-y-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Recommended Preventive Step</span>
                <p className="text-xs font-semibold text-green-400">{pred.recommended_action}</p>
                <div className="text-[9px] text-gray-500 font-bold bg-green-500/5 border border-green-500/10 rounded px-2.5 py-1 inline-block mt-2">
                  Potential complaint savings: {pred.potential_savings}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
