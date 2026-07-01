'use client';
export const dynamic = 'force-dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { issuesApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import BeforeAfterSlider from '@/components/reports/BeforeAfterSlider';
import { toast } from 'react-hot-toast';
import { Check, ShieldAlert, Sparkles, Camera, ClipboardList, AlertTriangle } from 'lucide-react';

export default function GovIssueDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [issue, setIssue] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);

  // Resolution states
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // AI Verdict Display
  const [aiVerdict, setAiVerdict] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchIssueDetails = async () => {
    try {
      const res = await issuesApi.get(id);
      setIssue(res.data.issue);
      setStatus(res.data.issue.status);
      setHistory(res.data.status_history);
      setComments(res.data.comments);
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

  const handleUpdateStatus = async () => {
    setIsUpdatingStatus(true);
    try {
      await issuesApi.updateStatus(id, { status: status as any, notes });
      toast.success('Issue lifecycle status updated!');
      setNotes('');
      fetchIssueDetails();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResolutionFile(file);
      setResolutionPreview(URL.createObjectURL(file));
    }
  };

  const handleResolveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionFile) {
      toast.error('Please upload an after-resolution photo for AI verification');
      return;
    }
    if (!resolutionNotes) {
      toast.error('Please enter resolution notes');
      return;
    }

    const formData = new FormData();
    formData.append('notes', resolutionNotes);
    formData.append('images', resolutionFile);

    setIsSubmittingResolution(true);
    toast.loading('AI comparing before/after images for verification...', { id: 'resolution-ai' });

    try {
      const res = await issuesApi.resolve(id, formData);
      const verdict = res.data.verification_result;
      setAiVerdict(verdict);

      if (verdict.result === 'verified_resolved') {
        toast.success('AI Verified: Issue resolved successfully!', { id: 'resolution-ai' });
      } else {
        toast.error('AI Flagged: Fix could not be verified. Escalated for review.', { id: 'resolution-ai', duration: 5000 });
      }

      fetchIssueDetails();
    } catch (err) {
      toast.error('Failed to process resolution', { id: 'resolution-ai' });
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  if (loading || !issue) {
    return <div className="h-96 flex items-center justify-center text-gray-500">Retrieving details...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Link */}
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to active queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details (Left, 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 block font-mono font-bold">{issue.issue_number}</span>
                  <h2 className="text-xl font-bold text-white leading-tight">{issue.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={issue.severity === 'critical' ? 'destructive' : 'default'} className="capitalize">
                    {issue.severity}
                  </Badge>
                  <Badge className="bg-white/5 text-blue-400 border border-blue-500/20 capitalize">
                    {issue.category.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* Photos Comparison */}
              {issue.status === 'resolved' && issue.resolution_image_urls?.length > 0 && issue.image_urls?.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">AI Before/After Comparison</span>
                  <BeforeAfterSlider beforeImage={issue.image_urls[0]} afterImage={issue.resolution_image_urls[0]} />
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-300">
                    <span className="font-bold flex items-center gap-1">
                      <Check size={16} />
                      AI Status: Resolved and Verified
                    </span>
                    <p className="mt-1">{issue.before_after_analysis}</p>
                  </div>
                </div>
              ) : issue.status === 'flagged' && issue.resolution_image_urls?.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">AI Before/After Comparison</span>
                  <BeforeAfterSlider beforeImage={issue.image_urls[0]} afterImage={issue.resolution_image_urls[0]} />
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 animate-pulse-glow">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={16} />
                      AI Status: Flagged for Review (Unresolved)
                    </span>
                    <p className="mt-1">
                      Our Before/After image comparison AI determined that the issue still appears unresolved. This issue has been flagged for manual administrative review.
                    </p>
                    <div className="mt-2 text-gray-400 font-semibold">AI Analysis: {issue.before_after_analysis}</div>
                  </div>
                </div>
              ) : (
                issue.image_urls && issue.image_urls.length > 0 && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={issue.image_urls[0]} alt="Issue Photo" className="w-full h-full object-cover" />
                  </div>
                )
              )}

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Citizen Description</span>
                <p className="text-sm text-gray-300 leading-relaxed">{issue.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Resolution submission console (if not already resolved/closed) */}
          {issue.status !== 'resolved' && issue.status !== 'closed' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Camera size={18} className="text-blue-400" />
                  Resolve Issue (Before/After AI Verification)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResolveIssue} className="space-y-4">
                  {/* Image upload */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-400 block">Upload After-Resolution Photo</span>
                    {resolutionPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolutionPreview} alt="Resolution preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setResolutionFile(null);
                            setResolutionPreview(null);
                          }}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 text-xs"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="border border-dashed border-white/10 rounded-xl p-8 text-center relative cursor-pointer hover:border-blue-500/25 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <Camera size={24} className="text-gray-500" />
                          <span className="text-xs text-gray-300 font-semibold">Choose photo after resolution</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resolution notes */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-400 block">Resolution Notes</span>
                    <Input
                      placeholder="Explain what steps were taken to resolve this problem..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full mt-2" disabled={isSubmittingResolution}>
                    {isSubmittingResolution ? 'Running AI Verification...' : 'Verify & Submit Resolution'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Citizen comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-gray-400">Citizen Conversation history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.map((comment, idx) => (
                <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs">
                  <div className="flex justify-between text-gray-400 text-[10px] mb-1">
                    <span>{comment.is_anonymous ? 'Anonymous Citizen' : 'Citizen Hero'}</span>
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-300">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-500">No citizen comments recorded.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Column (Right, 1 col) */}
        <div className="space-y-6">
          {/* Priority Card */}
          <Card className="text-center">
            <CardContent className="pt-6">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">Priority Index</span>
              <div className="text-5xl font-black text-amber-500">{issue.priority_score}/100</div>
              <Badge className="mt-3 capitalize">{issue.severity} Severity</Badge>
            </CardContent>
          </Card>

          {/* Quick status update panel */}
          {issue.status !== 'resolved' && issue.status !== 'closed' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase text-gray-400">Update Lifecycle Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed / Rejected</option>
                  </Select>

                  <Input
                    placeholder="Action notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />

                  <Button onClick={handleUpdateStatus} className="w-full h-9 text-xs" disabled={isUpdatingStatus}>
                    Update Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase text-gray-400">Lifecycle Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div>
                  <span className="text-xs font-bold block capitalize text-amber-400">{issue.status.replace('_', ' ')}</span>
                  <span className="text-[9px] text-gray-400">Last updated: {new Date(issue.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="border-l border-white/5 ml-1.25 pl-4 space-y-3 pt-2 text-xs">
                {history.map((hist, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-5 top-1.5 w-1 h-1 rounded-full bg-gray-500" />
                    <span className="font-semibold text-gray-300 capitalize">{hist.status.replace('_', ' ')}</span>
                    <span className="text-[9px] text-gray-500 block">{new Date(hist.created_at).toLocaleDateString()}</span>
                    {hist.notes && <span className="text-[9px] text-gray-500 block italic">{hist.notes}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
