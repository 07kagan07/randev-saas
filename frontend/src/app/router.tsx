import React, { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, useRouteError } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import SuperAdminLayout from '../components/shared/SuperAdminLayout';
import AdminLayout from '../components/shared/AdminLayout';
import StaffLayout from '../components/shared/StaffLayout';

// Yeni deploy sonrası eski chunk hash'leri geçersiz olunca otomatik sayfa yeniler
function lazyLoad(factory: () => Promise<any>) {
  return lazy(() =>
    factory().catch((err: Error) => {
      if (isChunkError(err)) {
        window.location.reload();
        return new Promise(() => {/* reload bekleniyor */});
      }
      return Promise.reject(err);
    }),
  );
}

function isChunkError(err: any): boolean {
  const msg: string = err?.message ?? '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Unable to preload CSS') ||
    msg.includes('ChunkLoadError')
  );
}

// React Router'ın kendi error boundary'si chunk hatasını yakalarsa → otomatik reload
function ErrorPage() {
  const error = useRouteError() as Error;

  useEffect(() => {
    if (isChunkError(error)) {
      const RELOAD_KEY = 'chunk_error_reloaded';
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
      }
    }
  }, [error]);

  // Chunk hatası: reload tetiklendi, spinner göster
  if (isChunkError(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  // Diğer hatalar
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <p className="text-gray-700 font-medium">Bir hata oluştu.</p>
      <p className="text-sm text-red-500">{error?.message}</p>
      <button
        onClick={() => { window.location.href = '/'; }}
        className="text-indigo-600 underline text-sm"
      >
        Ana sayfaya dön
      </button>
    </div>
  );
}

const LoginPage             = lazyLoad(() => import('../pages/public/LoginPage'));
const RegisterPage          = lazyLoad(() => import('../pages/public/RegisterPage'));
const StorefrontPage        = lazyLoad(() => import('../pages/public/StorefrontPage'));
const BookingPage           = lazyLoad(() => import('../pages/public/BookingPage'));
const AppointmentActionPage = lazyLoad(() => import('../pages/public/AppointmentActionPage'));

const AdminDashboard    = lazyLoad(() => import('../pages/admin/DashboardPage'));
const AdminAppointments = lazyLoad(() => import('../pages/admin/AppointmentsPage'));
const AdminOnboarding   = lazyLoad(() => import('../pages/admin/OnboardingPage'));
const AdminMySchedule   = lazyLoad(() => import('../pages/admin/MySchedulePage'));
const AdminStaff        = lazyLoad(() => import('../pages/admin/StaffPage'));
const AdminServices     = lazyLoad(() => import('../pages/admin/ServicesPage'));
const AdminReports      = lazyLoad(() => import('../pages/admin/ReportsPage'));
const AdminSettings     = lazyLoad(() => import('../pages/admin/SettingsPage'));

const StaffDashboard    = lazyLoad(() => import('../pages/staff/DashboardPage'));
const StaffAppointments = lazyLoad(() => import('../pages/staff/AppointmentsPage'));
const StaffWorkingHours = lazyLoad(() => import('../pages/staff/WorkingHoursPage'));

const SuperAdminDashboard  = lazyLoad(() => import('../pages/superadmin/DashboardPage'));
const SuperAdminBusinesses = lazyLoad(() => import('../pages/superadmin/BusinessesPage'));
const SuperAdminTickets    = lazyLoad(() => import('../pages/superadmin/TicketsPage'));

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
    </div>
  );
}

function S(Component: React.ComponentType) {
  return (
    <Suspense fallback={<Loader />}>
      <Component />
    </Suspense>
  );
}

function RequireAuth({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, isInitialized, user, initialize } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) initialize();
  }, [isInitialized, initialize]);

  if (!isInitialized) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Başarılı yüklemede reload guard'ı temizle
function RootLayout() {
  useEffect(() => {
    sessionStorage.removeItem('chunk_error_reloaded');
  }, []);
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    // Pathless root route — global error boundary + guard temizleme
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/login',               element: S(LoginPage) },
      { path: '/register',            element: S(RegisterPage) },
      { path: '/:slug',               element: S(StorefrontPage) },
      { path: '/:slug/book',          element: S(BookingPage) },
      { path: '/appointments/action', element: S(AppointmentActionPage) },

      // Admin routes — AdminLayout ile nested
      {
        path: '/admin',
        element: (
          <RequireAuth role="business_admin">
            <AdminLayout />
          </RequireAuth>
        ),
        children: [
          { index: true,               element: S(AdminDashboard)    },
          { path: 'onboarding',        element: S(AdminOnboarding)   },
          { path: 'appointments',      element: S(AdminAppointments) },
          { path: 'my-schedule',       element: S(AdminMySchedule)   },
          { path: 'staff',             element: S(AdminStaff)        },
          { path: 'services',          element: S(AdminServices)     },
          { path: 'reports',           element: S(AdminReports)      },
          { path: 'settings',          element: S(AdminSettings)     },
        ],
      },

      // Staff routes — StaffLayout ile nested
      {
        path: '/staff',
        element: (
          <RequireAuth role="staff">
            <StaffLayout />
          </RequireAuth>
        ),
        children: [
          { index: true,           element: S(StaffDashboard)    },
          { path: 'appointments',  element: S(StaffAppointments) },
          { path: 'hours',         element: S(StaffWorkingHours) },
        ],
      },

      // Super Admin routes — nested
      {
        path: '/superadmin',
        element: (
          <RequireAuth role="super_admin">
            <SuperAdminLayout />
          </RequireAuth>
        ),
        children: [
          { index: true,            element: S(SuperAdminDashboard)  },
          { path: 'businesses',     element: S(SuperAdminBusinesses) },
          { path: 'tickets',        element: S(SuperAdminTickets)    },
        ],
      },

      { path: '/',  element: <Navigate to="/login" replace /> },
      { path: '*',  element: <Navigate to="/" replace /> },
    ],
  },
]);
