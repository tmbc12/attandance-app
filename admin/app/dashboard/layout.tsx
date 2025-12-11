'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import ModalProvider from '../../components/modals/ModalProvider';
import { useAppDispatch } from '../../lib/hooks/useRedux';
import { setSession } from '../../lib/slices/authSlice';
// import type { RootState } from '../../lib/store';

const REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // Refresh every 7 days (well before 30-day expiry)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, update } = useSession();
  const dispatch = useAppDispatch();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  // const sidebarOpen = useAppSelector((state: RootState) => state.ui.sidebarOpen);

  // Sync NextAuth session with Redux when available
  useEffect(() => {
    if (session) {
      dispatch(setSession(session));
    }
  }, [session, dispatch]);

  // Automatic session refresh to prevent expiration
  useEffect(() => {
    if (!session) {
      // Clear any existing refresh timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    // Only set up the timer if it doesn't exist yet
    if (refreshTimerRef.current) {
      return;
    }

    const refreshSession = async () => {
      try {
        console.log('🔄 Proactively refreshing admin session...');
        await update(); // NextAuth will automatically refresh the session
        console.log('✅ Admin session refreshed successfully');
      } catch (error) {
        console.error('❌ Admin session refresh failed:', error);
      }
    };

    // Set up periodic refresh (no initial call to avoid infinite loop)
    refreshTimerRef.current = setInterval(() => {
      refreshSession();
    }, REFRESH_INTERVAL);

    // Cleanup function
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [session, update]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <ModalProvider />
    </div>
  );
}
