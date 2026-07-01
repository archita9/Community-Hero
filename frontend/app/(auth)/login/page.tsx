'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { signInWithGoogle } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setUser(res.data.user, res.data.access_token);
      toast.success(`Welcome back, ${res.data.user.full_name || 'Hero'}!`);
      if (['government', 'admin'].includes(res.data.user.role)) {
        router.push('/government/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { token, name } = await signInWithGoogle();
      const res = await authApi.firebase({ firebase_token: token, full_name: name });
      setUser(res.data.user, res.data.access_token);
      toast.success(`Welcome, ${res.data.user.full_name || 'Hero'}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error('Google login failed or popup blocked. Try email login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    try {
      const res = await authApi.anonymous();
      setUser(res.data.user, res.data.access_token);
      toast.success(`Welcome, ${res.data.user.full_name || 'Hero'}! Your privacy is protected.`);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Anonymous login failed. Is backend running?';
      toast.error(msg);
      console.error('Anonymous login error:', err?.response?.data || err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="gradient-hero min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <span className="text-4xl">🦸</span>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Welcome back to CivicLens AI
          </CardTitle>
          <CardDescription>
            Report issues, earn rewards, and make your community safer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Email Address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a0f1e] px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleGoogleLogin} disabled={isLoading}>
              Google
            </Button>
            <Button variant="outline" onClick={handleAnonymousLogin} disabled={isLoading}>
              Anonymous
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-xs text-gray-400">
          <div>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:underline">
              Create one
            </Link>
          </div>
          <div>
            <Link href="/map" className="text-blue-500 font-semibold hover:underline">
              Browse public map as guest 🗺️
            </Link>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
