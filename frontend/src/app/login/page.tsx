'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpired = searchParams.get('expired') === 'true';
  const returnUrl = searchParams.get('from') || '/';

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(returnUrl);
    }
  }, [isAuthenticated, authLoading, router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      router.push(returnUrl);
    } else {
      setError(result.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand */}
        <div className="flex justify-center items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#8B7CFF] flex items-center justify-center text-white shadow-lg shadow-[#635BFF]/25">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-[#151923]">
            Admatrix<span className="text-[#635BFF]">.</span>
          </span>
        </div>

        <h2 className="text-center text-xl font-bold tracking-tight text-[#151923]">
          Sign in to your Brokerage Engine
        </h2>
        <p className="mt-1 text-center text-xs text-[#737B8C]">
          Compliant Dubai Real Estate Advertising & Lead Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E8EAF0] rounded-2xl sm:px-10">
          {/* Notifications / Alerts */}
          {isExpired && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Session Expired:</span> Your session has timed out. Please sign in again to continue.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Authentication Failed:</span> {error}
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#151923] mb-1.5">
                Work Email
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#737B8C]" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="broker@agency.ae"
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-[#E8EAF0] rounded-xl text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:border-transparent text-[#151923] placeholder-[#737B8C] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-[#151923]">
                  Password
                </label>
                <a href="#forgot" className="text-[11px] font-medium text-[#635BFF] hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#737B8C]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-[#E8EAF0] rounded-xl text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:border-transparent text-[#151923] placeholder-[#737B8C] transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#635BFF] hover:bg-[#5248E2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#635BFF] disabled:opacity-50 transition-all shadow-md shadow-[#635BFF]/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Personas */}
          <div className="mt-6 pt-6 border-t border-[#E8EAF0]">
            <span className="block text-[11px] font-semibold text-[#737B8C] uppercase tracking-wider mb-2.5 text-center">
              Quick Test Personas (Pre-Seeded)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@apexrealty.ae')}
                className="px-2.5 py-2 rounded-lg border border-[#E8EAF0] hover:border-[#635BFF] hover:bg-[#F0EFFF] text-left transition-colors"
              >
                <div className="font-semibold text-[#151923] text-[11px]">Brokerage Admin</div>
                <div className="text-[10px] text-[#737B8C] truncate">admin@apexrealty.ae</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('sarah@apexrealty.ae')}
                className="px-2.5 py-2 rounded-lg border border-[#E8EAF0] hover:border-[#635BFF] hover:bg-[#F0EFFF] text-left transition-colors"
              >
                <div className="font-semibold text-[#151923] text-[11px]">Individual Broker</div>
                <div className="text-[10px] text-[#737B8C] truncate">sarah@apexrealty.ae</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('junior@apexrealty.ae')}
                className="px-2.5 py-2 rounded-lg border border-[#E8EAF0] hover:border-[#635BFF] hover:bg-[#F0EFFF] text-left transition-colors"
              >
                <div className="font-semibold text-[#151923] text-[11px]">Junior Agent</div>
                <div className="text-[10px] text-[#737B8C] truncate">junior@apexrealty.ae</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin@admatrixplatform.ae')}
                className="px-2.5 py-2 rounded-lg border border-[#E8EAF0] hover:border-[#635BFF] hover:bg-[#F0EFFF] text-left transition-colors"
              >
                <div className="font-semibold text-[#151923] text-[11px]">Platform Admin</div>
                <div className="text-[10px] text-[#737B8C] truncate">superadmin@...</div>
              </button>
            </div>
          </div>

          {/* Footer link to register */}
          <div className="mt-6 text-center text-xs text-[#737B8C]">
            New brokerage?{' '}
            <Link href="/register" className="font-semibold text-[#635BFF] hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-[11px] text-[#737B8C] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#00A86B]" />
          <span>Secured with Argon2id & Redis Multi-Tenant Isolation</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center text-xs text-[#737B8C]">Loading authentication...</div>}>
      <LoginForm />
    </Suspense>
  );
}

