'use client';
import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';
import { Award, ShieldAlert, CheckCircle2, History } from 'lucide-react';

export default function CitizenProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [profileData, setProfileData] = useState<any>(null);
  const [myIssues, setMyIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [meRes, issuesRes] = await Promise.all([
          usersApi.me(),
          usersApi.myIssues(),
        ]);
        setProfileData(meRes.data);
        setMyIssues(issuesRes.data.items || []);
      } catch (err) {
        toast.error('Failed to load profile details');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading || !profileData) {
    return <div className="h-96 flex items-center justify-center text-gray-500">Retrieving profile...</div>;
  }

  const badgeIcon =
    profileData.badge_tier === 'champion' ? '👑' :
    profileData.badge_tier === 'gold' ? '🥇' :
    profileData.badge_tier === 'silver' ? '🥈' : '🥉';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Badge details */}
        <Card className="text-center p-6 flex flex-col items-center justify-between">
          <div className="space-y-3">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-center text-4xl shadow-lg">
              {badgeIcon}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">{profileData.full_name || 'Hero Citizen'}</h3>
              <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{profileData.email}</span>
            </div>
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-black border-none uppercase font-extrabold px-3 py-1">
              {profileData.badge_tier} Hero
            </Badge>
          </div>

          <div className="w-full border-t border-white/5 pt-4 mt-4 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">Rewards</span>
              <span className="font-extrabold text-blue-400 text-lg">{profileData.points}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">Verified</span>
              <span className="font-extrabold text-green-400 text-lg">{profileData.verifications_done}</span>
            </div>
          </div>
        </Card>

        {/* Right column: Trust score & statistics */}
        <div className="md:col-span-2 space-y-6">
          {/* Trust Score indicator */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-base">Citizen Trust Score</h4>
                  <p className="text-xs text-gray-400">Based on genuine reports, confirmations, and duplicate merges.</p>
                </div>
                <div className="text-3xl font-black text-green-400">
                  {profileData.trust_score}%
                </div>
              </div>

              {/* Progress bar */}
              <div className="trust-bar w-full">
                <div className="trust-fill" style={{ width: `${profileData.trust_score || 75}%` }} />
              </div>

              <div className="flex justify-between text-[10px] text-gray-500">
                <span>NEW MEMBER</span>
                <span>AUTHENTIC CONTRIBUTOR</span>
                <span>COMMUNITY ELITE</span>
              </div>
            </div>
          </Card>

          {/* Submitted Issues history */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <History size={18} className="text-purple-400" />
              <CardTitle className="text-base font-bold">My Report History ({myIssues.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myIssues.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">No issues reported yet. Make your first report!</div>
              ) : (
                myIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate max-w-[200px]">{issue.title}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">{issue.address || 'Coordinates'}</div>
                    </div>
                    <Badge variant={issue.status === 'resolved' ? 'success' : 'default'} className="capitalize shrink-0">
                      {issue.status.replace('_', ' ')}
                    </Badge>
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
