'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { issuesApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import LiveStatsBanner from '@/components/dashboard/LiveStatsBanner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, PlusCircle, ArrowRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CitizenDashboard() {
  const user = useAuthStore((s) => s.user);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leadRes, issuesRes] = await Promise.all([
          issuesApi.liveStats(),
          usersApi.leaderboard(5),
          issuesApi.list({ per_page: 5 }),
        ]);
        setLiveStats(statsRes.data);
        setLeaderboard(leadRes.data);
        setRecentIssues(issuesRes.data.items);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Live Stats Banner */}
      <LiveStatsBanner stats={liveStats} loading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Quick Actions & Rewards */}
        <div className="space-y-6 lg:col-span-2">
          {/* Hero Welcome Action */}
          <Card className="gradient-card border-blue-500/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-bold text-white">Make Your Neighborhood Clean & Safe</h2>
              <p className="text-sm text-gray-300 max-w-md">
                Spotted a pothole, overflow drainage, or broken streetlight? Report it instantly. AI handles routing & verification.
              </p>
            </div>
            <Link href="/report">
              <Button size="lg" className="flex items-center gap-2">
                <PlusCircle size={20} />
                Report Civic Problem
              </Button>
            </Link>
          </Card>

          {/* Recent Issues List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-bold">Recent Nearby Issues</CardTitle>
              <Link href="/map" className="text-xs text-blue-400 font-semibold hover:underline flex items-center gap-1">
                View map <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)
              ) : recentIssues.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No issues reported recently.</div>
              ) : (
                recentIssues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/issues/${issue.id}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:border-blue-500/20 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl">
                        {issue.category === 'pothole' && '🕳️'}
                        {issue.category === 'garbage' && '🗑️'}
                        {issue.category === 'water_leakage' && '💧'}
                        {issue.category === 'streetlight' && '⚡'}
                        {issue.category === 'road_damage' && '🛣️'}
                        {issue.category === 'tree_fall' && '🌳'}
                        {issue.category === 'drainage' && '🌊'}
                        {issue.category === 'other' && '🏛️'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate text-sm">{issue.title}</div>
                        <div className="text-xs text-gray-400 truncate mt-1">{issue.address || 'Location detected'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={
                        issue.severity === 'critical' ? 'destructive' :
                        issue.severity === 'high' ? 'warning' : 'default'
                      } className="capitalize text-[10px]">
                        {issue.severity}
                      </Badge>
                      <span className="text-xs text-gray-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg">
                        {issue.priority_score}/100
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Rewards & Leaderboard */}
        <div className="space-y-6">
          {/* Rewards Panel */}
          {user && (
            <Card className="bg-gradient-to-br from-[#1e2d4a]/40 to-[#111827] border-blue-500/10">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30 text-3xl">
                  🏆
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-lg">Citizen Hero Rank</h3>
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-black border-none uppercase font-extrabold px-3 py-1">
                    {user.badge_tier} Hero
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div>
                    <div className="text-xs text-gray-400">Total Points</div>
                    <div className="text-2xl font-black text-blue-400 mt-1">{user.points}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Reports Sent</div>
                    <div className="text-2xl font-black text-purple-400 mt-1">{user.reports_submitted}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard widget */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Community Leaders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-10 skeleton rounded-lg" />)
              ) : (
                leaderboard.map((leader, i) => (
                  <div
                    key={leader.user_id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-500 w-4">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center font-bold text-xs text-blue-400">
                        {leader.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm font-semibold text-white truncate max-w-[120px]">
                        {leader.full_name || 'Anonymous Hero'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-bold">{leader.points} pts</span>
                      <Badge className="text-[9px] uppercase font-bold">{leader.badge_tier}</Badge>
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
