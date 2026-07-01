'use client';
export const dynamic = 'force-dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { issuesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BeforeAfterSlider from '@/components/reports/BeforeAfterSlider';
import { toast } from 'react-hot-toast';
import { Clock, ShieldAlert, Sparkles, MapPin, Share2, ThumbsUp, ThumbsDown, MessageSquare, LogIn, LayoutDashboard } from 'lucide-react';

export default function UnifiedIssueDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [issue, setIssue] = useState<any>(null);
  const [confirmations, setConfirmations] = useState(0);
  const [rejections, setRejections] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [prediction, setPrediction] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  const fetchIssueDetails = async () => {
    try {
      const res = await issuesApi.get(id);
      setIssue(res.data.issue);
      setConfirmations(res.data.confirmations);
      setRejections(res.data.rejections);
      setComments(res.data.comments);
      setPrediction(res.data.resolution_prediction);
      setHistory(res.data.status_history);
    } catch (err) {
      toast.error('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchIssueDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleVote = async (vote: 'confirm' | 'reject') => {
    if (!token) {
      toast.error('Please log in to verify community issues');
      router.push('/login');
      return;
    }
    setVoteSubmitting(true);
    try {
      await issuesApi.verify(id, { vote });
      toast.success(`Verification vote recorded!`);
      fetchIssueDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Vote registered already.');
    } finally {
      setVoteSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please log in to add comments');
      router.push('/login');
      return;
    }
    if (!newComment.trim()) return;
    try {
      await issuesApi.comment(id, { content: newComment });
      toast.success('Comment added!');
      setNewComment('');
      fetchIssueDetails();
    } catch (err) {
      toast.error('Failed to post comment.');
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Issue link copied to clipboard!');
    }
  };

  if (loading || !issue) {
    return <div className="h-96 flex items-center justify-center text-gray-500">Retrieving details...</div>;
  }

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
            Issue Details
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
              <Link href="/map">
                <Button size="sm">Map View</Button>
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

      {/* Main Details Body */}
      <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Back Link */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back to map
          </button>
          <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-1.5">
            <Share2 size={14} />
            Share Issue
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info (Left, 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 block font-bold">{issue.issue_number}</span>
                    <h2 className="text-xl font-bold text-white leading-tight">{issue.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={issue.severity === 'critical' ? 'destructive' : 'default'} className="capitalize px-3 py-1">
                      {issue.severity}
                    </Badge>
                    <Badge className="bg-white/5 text-blue-400 border border-blue-500/20 capitalize px-3 py-1">
                      {issue.category.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Before/After comparison slider */}
                {issue.status === 'resolved' && issue.resolution_image_urls?.length > 0 && issue.image_urls?.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">AI Before/After Resolution Verification</span>
                    <BeforeAfterSlider beforeImage={issue.image_urls[0]} afterImage={issue.resolution_image_urls[0]} />
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-300 mt-2">
                      <span className="font-bold block">AI Verdict: Verified Resolved ✅</span>
                      <p className="mt-1">{issue.before_after_analysis || 'AI has compared both images and confirmed resolution.'}</p>
                    </div>
                  </div>
                ) : (
                  issue.image_urls && issue.image_urls.length > 0 && (
                    <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/40 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={issue.image_urls[0]} alt="Issue Photo" className="w-full h-full object-cover" />
                    </div>
                  )
                )}

                {/* Description */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Description</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{issue.description}</p>
                  {issue.enhanced_description && issue.enhanced_description !== issue.description && (
                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-blue-300 flex gap-2">
                      <Sparkles size={16} className="text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">AI Enhanced Description</span>
                        <p className="mt-1">{issue.enhanced_description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Verification Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Community Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-400">
                  Are you nearby? Help verify this problem to increase AI confidence score and accelerate routing.
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 flex items-center justify-center gap-2"
                          onClick={() => handleVote('confirm')} disabled={voteSubmitting}>
                    <ThumbsUp size={16} className="text-green-400" />
                    Confirm ({confirmations})
                  </Button>
                  <Button variant="outline" className="flex-1 flex items-center justify-center gap-2"
                          onClick={() => handleVote('reject')} disabled={voteSubmitting}>
                    <ThumbsDown size={16} className="text-red-400" />
                    Reject ({rejections})
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comments List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MessageSquare size={18} />
                  Citizen Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    placeholder={token ? "Ask a question or provide update notes..." : "Log in to join the conversation"}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={!token}
                  />
                  <Button type="submit" disabled={!token}>Post</Button>
                </form>

                {/* List */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-500">No comments yet.</div>
                  ) : (
                    comments.map((comment, idx) => (
                      <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span className="font-semibold">{comment.is_anonymous ? 'Anonymous' : 'Hero Citizen'}</span>
                          <span>{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-300">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info (Right, 1 col) */}
          <div className="space-y-6">
            <Card className="text-center">
              <CardContent className="pt-6 space-y-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Priority Score</span>
                <div className="text-5xl font-black text-blue-400">
                  {issue.priority_score}<span className="text-xs text-gray-400 font-normal">/100</span>
                </div>
              </CardContent>
            </Card>

            {/* Department routing */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Smart Assignment</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-xl">
                    🏢
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Routed Department</span>
                    <span className="text-sm font-bold text-white">{issue.department_id ? 'Municipal Corp' : 'Auto-Routing Engine'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expected Resolution Date */}
            {prediction && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">AI Resolution Predictor</span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-xl">
                      ⏱️
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">Expected Fix Duration</span>
                      <span className="text-sm font-bold text-amber-400">{prediction.label}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lifecycle Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase text-gray-400">Issue Life Cycle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div>
                    <span className="text-xs font-bold block capitalize text-blue-400">{issue.status.replace('_', ' ')}</span>
                    <span className="text-[9px] text-gray-400">Last updated: {new Date(issue.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="border-l-2 border-white/5 ml-1.25 pl-4 space-y-3 pt-2">
                  {history.map((hist, idx) => (
                    <div key={idx} className="text-xs relative">
                      <span className="absolute -left-5 top-1.5 w-1.5 h-1.5 rounded-full bg-gray-500" />
                      <span className="font-semibold text-gray-300 capitalize">{hist.status.replace('_', ' ')}</span>
                      <span className="text-[9px] text-gray-400 block">{new Date(hist.created_at).toLocaleDateString()}</span>
                      {hist.notes && <span className="text-[10px] text-gray-500 block italic">{hist.notes}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
