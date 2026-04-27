import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import QuickAddModal from './QuickAddModal';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  queryKeyPrefix: string;
}

interface Props {
  /** Exactly 2 items — one left, one right of center FAB */
  items: [NavItem, NavItem];
  isAdmin: boolean;
}

export default function BottomNav({ items, isAdmin }: Props) {
  const { user } = useAuthStore();
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);

  if (!user?.business_id || !user?.id) return null;

  const isActive = (to: string) => location.pathname.startsWith(to);

  // Determine which query key to invalidate based on current page
  const activeQueryKey = items.find(i => isActive(i.to))?.queryKeyPrefix ?? items[0].queryKeyPrefix;

  const [left, right] = items;

  return (
    <>
      {addOpen && (
        <QuickAddModal
          businessId={user.business_id}
          isAdmin={isAdmin}
          currentUserId={user.id}
          onClose={() => setAddOpen(false)}
          queryKeyPrefix={activeQueryKey}
        />
      )}

      {/* Bottom bar — mobile only */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex items-end"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center w-full h-16">

          {/* Left item */}
          <NavLink
            to={left.to}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors"
          >
            {({ isActive: active }) => (
              <>
                <left.icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className={`text-[10px] font-medium ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {left.label}
                </span>
              </>
            )}
          </NavLink>

          {/* Center FAB */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-full relative">
            <button
              onClick={() => setAddOpen(true)}
              className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors -mt-5"
              aria-label="Randevu Ekle"
            >
              <Plus className="w-6 h-6" />
            </button>
            <span className="text-[10px] font-medium text-indigo-600 mt-0.5">Hızlı Ekle</span>
          </div>

          {/* Right item */}
          <NavLink
            to={right.to}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors"
          >
            {({ isActive: active }) => (
              <>
                <right.icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className={`text-[10px] font-medium ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {right.label}
                </span>
              </>
            )}
          </NavLink>

        </div>
      </nav>
    </>
  );
}
