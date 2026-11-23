'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Building2,
  Sparkles,
  Megaphone,
  Users2,
  BarChart3,
  Users,
  Layers,
  Settings,
  CreditCard,
  HelpCircle,
  ShieldCheck,
  LogOut,
  Sliders,
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, organization, role, logout } = useAuth();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isBrokerageAdmin = role === 'BROKERAGE_ADMIN';
  const isBroker = role === 'BROKER';
  const isAgent = role === 'AGENT';

  // Navigation Items with explicit Role Permissions
  const workspaceNav = [
    { name: 'Overview', href: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER', 'AGENT'] },
    { name: 'Properties', href: '/properties', icon: Building2, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER', 'AGENT'] },
    { name: 'Ad Studio', href: '/ad-studio', icon: Sparkles, badge: 'AI', roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER', 'AGENT'] },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER'] },
    { name: 'Leads', href: '/leads', icon: Users2, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER', 'AGENT'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER'] },
  ];

  const managementNav = [
    { name: 'Team', href: '/team', icon: Users, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN'] },
    { name: 'Integrations', href: '/integrations', icon: Layers, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN'] },
  ];

  const settingsNav = [
    { name: 'Account Settings', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER', 'AGENT'] },
    { name: 'Billing', href: '/settings#billing', icon: CreditCard, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN'] },
    { name: 'Help & Support', href: '/settings#support', icon: HelpCircle, roles: ['SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER', 'AGENT'] },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AP';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatRoleLabel = (r?: UserRole | null) => {
    switch (r) {
      case 'SUPER_ADMIN':
        return 'Platform Admin';
      case 'BROKERAGE_ADMIN':
        return 'Brokerage Admin';
      case 'BROKER':
        return 'Licensed Broker';
      case 'AGENT':
        return 'Junior Agent';
      default:
        return 'Broker';
    }
  };

  const filterByRole = (items: { roles: string[] }[]) => {
    if (!role) return [];
    if (role === 'SUPER_ADMIN') return items;
    return items.filter((item) => item.roles.includes(role));
  };

  return (
    <aside className={`h-screen sticky top-0 flex flex-col bg-white border-r border-[#E8EAF0] transition-all duration-200 z-30 select-none ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-[#E8EAF0] justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#8B7CFF] flex items-center justify-center text-white shadow-md shadow-[#635BFF]/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-[15px] tracking-tight text-[#151923] flex items-center gap-1.5">
                Admatrix
                <span className="text-[10px] bg-[#F0EFFF] text-[#635BFF] font-semibold px-1.5 py-0.5 rounded uppercase">DXB</span>
              </span>
              <span className="text-[11px] text-[#737B8C] font-medium leading-none">Property Engine</span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Workspace */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-[#737B8C] uppercase">
              Workspace
            </div>
          )}
          <nav className="space-y-1">
            {filterByRole(workspaceNav).map((item: any) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#F0EFFF] text-[#635BFF]'
                      : 'text-[#4B5565] hover:bg-[#F7F8FA] hover:text-[#151923]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#635BFF]' : 'text-[#737B8C]'}`} />
                  {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                  {!collapsed && item.badge && (
                    <span className="text-[10px] font-bold bg-[#635BFF] text-white px-1.5 py-0.5 rounded-full uppercase">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Management (Hidden for Agents) */}
        {filterByRole(managementNav).length > 0 && (
          <div>
            {!collapsed && (
              <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-[#737B8C] uppercase">
                Management
              </div>
            )}
            <nav className="space-y-1">
              {filterByRole(managementNav).map((item: any) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#F0EFFF] text-[#635BFF]'
                        : 'text-[#4B5565] hover:bg-[#F7F8FA] hover:text-[#151923]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#635BFF]' : 'text-[#737B8C]'}`} />
                    {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Settings */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-[#737B8C] uppercase">
              Settings
            </div>
          )}
          <nav className="space-y-1">
            {filterByRole(settingsNav).map((item: any) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#F0EFFF] text-[#635BFF]'
                      : 'text-[#4B5565] hover:bg-[#F7F8FA] hover:text-[#151923]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#635BFF]' : 'text-[#737B8C]'}`} />
                  {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Trakheesi Quick Badge */}
        {!collapsed && (
          <div className="p-3 bg-[#F7F8FA] border border-[#E8EAF0] rounded-xl text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#16A36A] font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>DLD Trakheesi Guard</span>
            </div>
            <p className="text-[11px] text-[#737B8C] leading-relaxed">
              Automated compliance checks active. Campaigns verified before Meta & Google sync.
            </p>
          </div>
        )}
      </div>

      {/* User / Org Footer */}
      <div className="p-3 border-t border-[#E8EAF0] bg-white">
        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F7F8FA] transition-colors group">
          <div className="w-8 h-8 rounded-full bg-[#151923] text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {getInitials(user?.name)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#151923] truncate">{user?.name || 'Agent'}</div>
              <div className="text-[10px] text-[#635BFF] font-medium truncate">
                {formatRoleLabel(role)}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="text-[#737B8C] hover:text-[#E05252] p-1.5 rounded-lg hover:bg-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
