'use client';
export const dynamic = 'force-dynamic';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { issuesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Camera, Mic, MapPin, Sparkles, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Audio/Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // AI loading and result states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [fakeDetection, setFakeDetection] = useState<any>(null);
  const [emergencyResult, setEmergencyResult] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onresult = (e: any) => {
          const text = e.results[0][0].transcript;
          setTranscript(text);
          setDescription((prev) => (prev ? `${prev} ${text}` : text));
          toast.success('Voice description captured!');
          setIsRecording(false);
        };

        rec.onerror = () => {
          toast.error('Voice recognition failed or not allowed');
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const handleStartVoice = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
      toast('Listening...', { icon: '🎙️' });
    }
  };

  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    toast.loading('Fetching current location...', { id: 'gps-location' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAddress(`Latitude: ${pos.coords.latitude.toFixed(5)}, Longitude: ${pos.coords.longitude.toFixed(5)}`);
        toast.success('GPS coordinates captured!', { id: 'gps-location' });
      },
      (err) => {
        toast.error('Unable to retrieve location. Please adjust manually.', { id: 'gps-location' });
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      toast.error('Please enter a description');
      return;
    }
    if (latitude === null || longitude === null) {
      toast.error('Please capture GPS coordinates or set manually');
      return;
    }

    const formData = new FormData();
    formData.append('description', description);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('address', address);
    formData.append('is_anonymous', isAnonymous.toString());

    if (selectedFile) {
      formData.append('images', selectedFile);
    }

    setIsAnalyzing(true);
    toast.loading('AI pipeline analyzing your report...', { id: 'ai-pipeline' });

    try {
      const res = await issuesApi.submit(formData);

      if (res.data.status === 'duplicate') {
        toast.dismiss('ai-pipeline');
        toast('This issue already exists nearby — your support has been added!', { icon: '🔁' });
        setAiResult({ is_duplicate: true, merged_into: res.data.merged_into });
      } else {
        toast.success('AI analysis complete! Issue registered.', { id: 'ai-pipeline' });
        setAiResult(res.data.issue);
        setFakeDetection(res.data.fake_detection);
        setEmergencyResult(res.data.emergency);
      }
      setIsSubmitted(true);
    } catch (err: any) {
      toast.dismiss('ai-pipeline');
      const detail = err?.response?.data?.detail;

      if (detail?.error === 'fake_image_detected') {
        // AI rejected the image as fake/downloaded
        setFakeDetection(detail);
        setAiResult({ is_fake_rejected: true });
        setIsSubmitted(true);
        toast.error('Image rejected by AI — not a genuine photo!');
      } else {
        const msg = typeof detail === 'string' ? detail : detail?.message || 'Submission failed. Is the backend running?';
        toast.error(msg);
        console.error('Submit error:', err?.response?.data);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isSubmitted && aiResult) {
    // --- FAKE IMAGE REJECTED SCREEN ---
    if (aiResult.is_fake_rejected) {
      return (
        <div className="max-w-xl mx-auto space-y-6">
          <Card className="border-red-500/30 bg-red-950/10">
            <CardHeader className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30 text-2xl mb-3">
                🚫
              </div>
              <CardTitle className="text-red-400">Image Rejected by AI</CardTitle>
              <p className="text-sm text-gray-400">
                Our AI detected this image is not a genuine photo of a civic issue.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <AlertTriangle size={16} />
                  Authenticity Check Failed
                </div>
                <p className="text-gray-300 text-sm">{fakeDetection?.message}</p>
                {fakeDetection?.authenticity_note && (
                  <p className="text-xs text-gray-400 italic">{fakeDetection.authenticity_note}</p>
                )}
                {fakeDetection?.fake_probability !== undefined && (
                  <div className="text-xs text-red-300">
                    Fake probability: {(fakeDetection.fake_probability * 100).toFixed(0)}%
                  </div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
                💡 Please take a real photo of the issue from your camera and try again.
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => {
                setIsSubmitted(false); setAiResult(null);
                setPreviewUrl(null); setSelectedFile(null); setFakeDetection(null);
              }}>
                Try Again with Real Photo
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // --- DUPLICATE MERGED SCREEN ---
    if (aiResult.is_duplicate) {
      return (
        <div className="max-w-xl mx-auto space-y-6">
          <Card className="border-blue-500/20 bg-blue-950/10">
            <CardHeader className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 text-2xl mb-3">
                🔁
              </div>
              <CardTitle className="text-white">Duplicate Issue Detected!</CardTitle>
              <p className="text-sm text-gray-400">
                This issue already exists in our system. Your report has been merged and community support added.
              </p>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="font-bold text-blue-400 text-sm">Merged with Existing Report</div>
                <p className="text-white text-sm font-medium">{aiResult.merged_into?.title}</p>
                <div className="flex gap-4 text-xs text-gray-400 mt-2">
                  <span>Issue: {aiResult.merged_into?.issue_number}</span>
                  <span>Status: <span className="capitalize text-green-400">{aiResult.merged_into?.status}</span></span>
                  <span>Match: {Math.round((aiResult.merged_into?.similarity_score || 0) * 100)}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  This prevents duplicate reports cluttering the system. Your support vote has been counted.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" className="w-full" onClick={() => {
                setIsSubmitted(false); setAiResult(null);
                setPreviewUrl(null); setSelectedFile(null);
              }}>
                Report Another Issue
              </Button>
              <Button className="w-full" onClick={() => router.push('/dashboard')}>
                View Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // --- SUCCESS SCREEN ---
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="border-green-500/20 bg-green-950/10">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 border border-green-500/30 text-xl mb-3">
              <CheckCircle2 size={24} />
            </div>
            <CardTitle className="text-white">Issue Successfully Registered</CardTitle>
            <p className="text-sm text-gray-400">Issue ID: {aiResult.issue_number}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Category</span>
                <span className="text-sm font-semibold capitalize text-white">{aiResult.category}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Severity</span>
                <span className="text-sm font-semibold capitalize text-white">{aiResult.severity}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Priority</span>
                <span className="text-sm font-semibold text-white">{aiResult.priority_score}/100</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Confidence</span>
                <span className="text-sm font-semibold text-white">{(aiResult.confidence_score * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* AI Authenticity result for passed images */}
            {aiResult.ai_analysis?.is_real_photo === true && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs flex gap-2">
                <ShieldCheck size={16} className="text-green-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-green-400">Photo Verified as Genuine</div>
                  <p className="text-gray-300 mt-0.5">{aiResult.ai_analysis?.authenticity_note}</p>
                </div>
              </div>
            )}

            {emergencyResult && (
              <div className="p-4 rounded-xl bg-orange-500/15 border border-orange-500/30 text-xs flex gap-2">
                <AlertTriangle size={18} className="text-orange-400 shrink-0" />
                <div>
                  <div className="font-bold text-orange-400">Emergency Escalated!</div>
                  <p className="text-gray-200 mt-1">
                    Detected: {emergencyResult.emergency_type} · Contacts: {emergencyResult.escalation_contacts?.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            <Button variant="outline" className="w-full" onClick={() => {
              setIsSubmitted(false); setAiResult(null);
              setPreviewUrl(null); setDescription(''); setSelectedFile(null);
            }}>
              Report Another
            </Button>
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-blue-400" size={20} />
            AI-Analyzed Issue Intake
          </CardTitle>
          <p className="text-sm text-gray-400">
            Submit photo, description, and location. Our AI pipeline handles category assignment, priority scoring, duplicate checking, and fake report screening.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 block">Upload Issue Media (Photo)</label>
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 text-xs"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/30 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Camera size={32} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-300">Drag & drop or Click to choose a file</span>
                    <span className="text-xs text-gray-500">Supports JPEG, PNG</span>
                  </div>
                </div>
              )}
            </div>

            {/* GPS Location intake */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 block">Geographical Coordinates (GPS)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Address or Location notes"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleFetchLocation} className="shrink-0 flex items-center gap-1">
                  <MapPin size={16} />
                  GPS Loc
                </Button>
              </div>
              {latitude !== null && longitude !== null && (
                <span className="text-xs text-green-400 block font-semibold">
                  ✓ Location captured: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </span>
              )}
            </div>

            {/* Description with voice assist */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-400">Issue Description</label>
                <button
                  type="button"
                  onClick={handleStartVoice}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    isRecording
                      ? 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse-glow'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Mic size={14} />
                  {isRecording ? 'Listening...' : 'Voice Assist'}
                </button>
              </div>
              <textarea
                placeholder="Describe the issue in detail. If you want, use the Voice Assist button to transcribe details automatically."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="form-input resize-none"
                disabled={isAnalyzing}
              />
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 mt-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-400" />
                <span className="text-sm text-gray-300">File Anonymously</span>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-[#111827] cursor-pointer"
              />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isAnalyzing || isRecording}>
              {isAnalyzing ? 'Processing AI Pipeline...' : 'Register Issue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
