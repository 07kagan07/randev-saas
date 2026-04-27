import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Scissors, TrendingUp, Settings, LogOut, Menu, Clock, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import LanguageSwitcher from './LanguageSwitcher';
import BottomNav from './BottomNav';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const staffNav = [
    { to: '/admin/appointments', label: t('nav.appointments'), icon: Calendar },
    { to: '/admin/my-schedule',  label: t('nav.mySchedule'),   icon: Clock },
  ];

  const adminNav = [
    { to: '/admin/dashboard',         label: t('nav.dashboard'),        icon: LayoutDashboard },
    { to: '/admin/all-appointments',  label: t('nav.allAppointments'),  icon: CalendarDays },
    { to: '/admin/staff',             label: t('nav.staff'),            icon: Users },
    { to: '/admin/services',  label: t('nav.services'),  icon: Scissors },
    { to: '/admin/reports',   label: t('nav.reports'),   icon: TrendingUp },
    { to: '/admin/settings',  label: t('nav.settings'),  icon: Settings },
  ];

  const allNav = [...staffNav, ...adminNav];

  const pageTitle = allNav.find(item =>
    (item as any).end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )?.label ?? t('nav.panel');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const bottomNavItems: [any, any] = [
    { to: '/admin/appointments', icon: Calendar, label: t('nav.appointments'), queryKeyPrefix: 'admin-day-appts' },
    { to: '/admin/my-schedule',  icon: Clock,    label: t('nav.mySchedule'),   queryKeyPrefix: 'admin-my-hours' },
  ];

  const NavItem = ({ item }: { item: typeof staffNav[0] }) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={(item as any).end}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          isActive ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <div className="flex h-[100dvh] bg-gray-100 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-[48] bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[49] w-60 bg-indigo-900 text-white flex flex-col transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">R</div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user?.full_name || t('nav.panel')}</p>
              <p className="text-xs text-indigo-300">{t('nav.adminPanel')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {staffNav.map(item => <NavItem key={item.to} item={item} />)}

          <div className="pt-3 pb-1">
            <p className="px-3 text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">{t('nav.adminSection')}</p>
          </div>

          {adminNav.map(item => <NavItem key={item.to} item={item} />)}
        </nav>

        <div className="pt-2 border-t border-indigo-800">
          <LanguageSwitcher variant="sidebar" mutedTextClass="text-indigo-200" hoverBgClass="hover:bg-white/10 hover:text-white" />
          <div className="px-3 pb-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-800">{pageTitle}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:pb-6 pb-24">
          <Outlet />
        </main>
      </div>

      <BottomNav items={bottomNavItems} isAdmin={true} />
    </div>
  );
}
