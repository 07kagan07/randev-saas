import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Scissors, TrendingUp, Settings, LogOut, Menu, Clock, Briefcase, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useAdminMode, setAdminMode } from '../../hooks/useAdminMode';

const STAFF_NAV_PATHS = ['/admin/appointments', '/admin/my-schedule'];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mode = useAdminMode();

  const staffNav = [
    { to: '/admin/appointments', label: t('nav.appointments'), icon: Calendar },
    { to: '/admin/my-schedule',  label: t('nav.mySchedule'),   icon: Clock },
  ];

  const adminNav = [
    { to: '/admin',              label: t('nav.dashboard'),    icon: LayoutDashboard, end: true },
    { to: '/admin/appointments', label: t('nav.appointments'), icon: Calendar },
    { to: '/admin/my-schedule',  label: t('nav.mySchedule'),   icon: Clock },
    { to: '/admin/staff',        label: t('nav.staff'),        icon: Users },
    { to: '/admin/services',     label: t('nav.services'),     icon: Scissors },
    { to: '/admin/reports',      label: t('nav.reports'),      icon: TrendingUp },
    { to: '/admin/settings',     label: t('nav.settings'),     icon: Settings },
  ];

  const nav = mode === 'staff' ? staffNav : adminNav;

  const pageTitle = nav.find(item =>
    (item as any).end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )?.label ?? t('nav.panel');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const switchMode = (next: 'staff' | 'admin') => {
    setAdminMode(next);
    setSidebarOpen(false);
    if (next === 'staff' && !STAFF_NAV_PATHS.some(p => location.pathname.startsWith(p))) {
      navigate('/admin/appointments');
    }
  };

  const isStaff = mode === 'staff';
  const bgClass   = isStaff ? 'bg-emerald-900' : 'bg-indigo-900';
  const bdClass   = isStaff ? 'border-emerald-800' : 'border-indigo-800';
  const subLabel  = isStaff ? t('nav.staffPanel') : t('nav.adminPanel');
  const subColor  = isStaff ? 'text-emerald-300' : 'text-indigo-300';
  const mutedText = isStaff ? 'text-emerald-200' : 'text-indigo-200';
  const hoverBg   = 'hover:bg-white/10 hover:text-white';

  return (
    <div className="flex h-[100dvh] bg-gray-100 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 w-60 ${bgClass} text-white flex flex-col transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`p-4 border-b ${bdClass}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
              {isStaff ? 'P' : 'R'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user?.full_name || t('nav.panel')}</p>
              <p className={`text-xs ${subColor}`}>{subLabel}</p>
            </div>
          </div>

          {/* Mode switcher */}
          <div className="flex rounded-lg overflow-hidden border border-white/20 text-xs font-medium">
            <button
              onClick={() => switchMode('staff')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors ${
                isStaff ? 'bg-white/25 text-white' : `${mutedText} ${hoverBg}`
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              {t('nav.staffMode')}
            </button>
            <button
              onClick={() => switchMode('admin')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors ${
                !isStaff ? 'bg-white/25 text-white' : `${mutedText} ${hoverBg}`
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              {t('nav.adminMode')}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={(item as any).end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-white/20 text-white' : `${mutedText} ${hoverBg}`
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={`p-3 border-t ${bdClass}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${mutedText} ${hoverBg} transition-colors`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-800">{pageTitle}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
