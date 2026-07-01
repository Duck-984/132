import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { expandApp, readyApp, showBackButton, hideBackButton } from '../lib/telegram';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

export const Layout = ({ children, showHeader = true, showBottomNav = true }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    expandApp();
    readyApp();
  }, []);

  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/home') {
      hideBackButton();
    } else {
      showBackButton(() => navigate(-1));
    }

    return () => {
      hideBackButton();
    };
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
      {showHeader && <Header />}

      <main className={`flex-1 ${showBottomNav ? 'pb-16' : ''}`}>
        {children}
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  );
};
