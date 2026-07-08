'use client';

import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronLeft, Network, LogOut } from 'lucide-react';

function SubcontractorLayoutContent({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/artisan/dashboard')}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={t('subcontractor', 'backToPro') || 'Back to Krafolt Pro'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push('/subcontractor/portal')}
            className="flex items-center gap-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Network className="h-4 w-4" />
            </span>
            <span className="font-display font-bold">
              {t('subcontractor', 'portalTitle') || 'Subcontractor Portal'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label={t('common', 'logout') || 'Logout'}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

export default function SubcontractorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="ARTISAN">
      <SubcontractorLayoutContent>{children}</SubcontractorLayoutContent>
    </ProtectedRoute>
  );
}
