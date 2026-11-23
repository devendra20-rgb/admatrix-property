'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Building2, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  requiredRoles?: UserRole[];
}

export function AppShell({ children, title, subtitle, requiredRoles }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, role } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [loading, isAuthenticated, pathname, router]);

  // Loading state skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#635BFF] to-[#8B7CFF] flex items-center justify-center text-white shadow-xl shadow-[#635BFF]/30 animate-pulse mb-4">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#737B8C]">
          <Loader2 className="w-4 h-4 animate-spin text-[#635BFF]" />
          <span>Authenticating Brokerage Session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Role Gate Check (if route specifies required roles)
  if (requiredRoles && role && role !== 'SUPER_ADMIN' && !requiredRoles.includes(role)) {
    return (
      <div className="min-h-screen flex bg-[#F7F8FA] text-[#151923]">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header title="Access Restricted" subtitle="Role-Based Security Policy" />
          <main className="flex-1 p-6 md:p-8 max-w-2xl w-full mx-auto flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-[#151923] mb-2">Restricted Section</h2>
            <p className="text-xs text-[#737B8C] leading-relaxed mb-6 max-w-md">
              Your current role (<span className="font-semibold text-[#151923]">{role}</span>) does not have authorization to view or execute operations in this section. Required roles: <span className="font-semibold text-[#635BFF]">{requiredRoles.join(', ')}</span>.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#635BFF] hover:bg-[#5248E2] text-white shadow-sm transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F7F8FA] text-[#151923]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
