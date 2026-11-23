'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'BROKERAGE_ADMIN' | 'BROKER' | 'AGENT'>('BROKERAGE_ADMIN');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError('Name, work email, and password are required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    setLoading(true);
    const result = await register({
      name,
      email,
      phone: phone || undefined,
      organizationName: organizationName || undefined,
      password,
      role,
    });
    setLoading(false);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Registration failed. Please check your information and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-10 sm:px-6 lg:px-8">
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
          Create your Brokerage Account
        </h2>
        <p className="mt-1 text-center text-xs text-[#737B8C]">
          Join top Dubai brokerages managing compliant property ads & high-value leads
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E8EAF0] rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Registration Error:</span> {error}
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#151923] mb-1.5">
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[#737B8C]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah Al Mansoori"
                    className="block w-full pl-9 pr-3 py-2 border border-[#E8EAF0] rounded-xl text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF] text-[#151923] placeholder-[#737B8C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#151923] mb-1.5">
                  Mobile / WhatsApp
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-[#737B8C]" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+971 50 123 4567"
                    className="block w-full pl-9 pr-3 py-2 border border-[#E8EAF0] rounded-xl text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF] text-[#151923] placeholder-[#737B8C]"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#151923] mb-1.5">
                Work Email
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#737B8C]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="broker@agency.ae"
                  className="block w-full pl-9 pr-3 py-2 border border-[#E8EAF0] rounded-xl text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF] text-[#151923] placeholder-[#737B8C]"
                />
              </div>
            </div>

            {/* Brokerage / Organization Name */}
            <div>
              <label className="block text-xs font-semibold text-[#151923] mb-1.5">
                Brokerage / Company Name
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-[#737B8C]" />
                </div>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Prestige Dubai Real Estate LLC"
                  className="block w-full pl-9 pr-3 py-2 border border-[#E8EAF0] rounded-xl text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF] text-[#151923] placeholder-[#737B8C]"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#151923] mb-1.5">
                Your Operational Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'BROKERAGE_ADMIN', label: 'Agency Admin', desc: 'Manage team & ads' },
                  { value: 'BROKER', label: 'Broker', desc: 'Manage listings' },
                  { value: 'AGENT', label: 'Agent', desc: 'Manage leads' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRole(item.value as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      role === item.value
                        ? 'border-[#635BFF] bg-[#F0EFFF] text-[#635BFF]'
                        : 'border-[#E8EAF0] bg-[#F7F8FA] text-[#737B8C] hover:bg-white'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#151923]">{item.label}</div>
                    <div className="text-[10px] text-[#737B8C] truncate">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#151923] mb-1.5">
                  Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#737B8C]" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="block w-full pl-9 pr-3 py-2 border border-[#E8EAF0] rounded-xl text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF] text-[#151923] placeholder-[#737B8C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#151923] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#737B8C]" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="block w-full pl-9 pr-3 py-2 border border-[#E8EAF0] rounded-xl text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF] text-[#151923] placeholder-[#737B8C]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#635BFF] hover:bg-[#5248E2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#635BFF] disabled:opacity-50 transition-all shadow-md shadow-[#635BFF]/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer link to login */}
          <div className="mt-6 text-center text-xs text-[#737B8C]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#635BFF] hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        {/* Security notice */}
        <div className="mt-6 text-center text-[11px] text-[#737B8C] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#00A86B]" />
          <span>Tenant Isolation Guaranteed &middot; Argon2id Hash Security</span>
        </div>
      </div>
    </div>
  );
}

