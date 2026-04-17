import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Scissors, TrendingUp, Settings, LogOut, Menu, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

const nav = [
  { to: '/admin',              label: 'Dashboard',         icon: LayoutDashboard, end: true },
  { to: '/admin/appointments', label: 'Randevular',        icon: Calendar },
  { to: '/admin/my-schedule',  label: 'Çalışma Saatlerim', icon: Clock },
  { to: '/admin/staff',        label: 'Personel',          icon: Users },
  { to: '/admin/services',     label: 'Hizmetler',         icon: Scissors },
  { to: '/admin/reports',      label: 'Raporlar',          icon: TrendingUp },
  { to: '/admin/settings',     label: 'Ayarlar',           icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageTitle = nav.find(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )?.label ?? 'Panel';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-[100dvh] bg-gray-100 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 w-60 bg-indigo-900 text-white flex flex-col transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">R</div>
            <div>
              <p className="font-semibold text-sm truncate">{user?.full_name || 'İşletme'}</p>
              <p className="text-xs text-indigo-300">Yönetici Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
          ))}
        </nav>

        <div className="p-3 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Çıkış Yap</span>
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
