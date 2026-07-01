import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Workspace } from './pages/Workspace';
import { History } from './pages/History';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { Auth } from './pages/Auth';
import { TooltipProvider } from './components/ui/tooltip';
import { hasToken, clearToken, api } from './lib/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(hasToken);
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('scanai_avatar') || null);

  // Restore user from token on page refresh
  useEffect(() => {
    if (hasToken() && !user) {
      api.me()
        .then(setUser)
        .catch(() => {
          // Token expired or invalid — clear and stay on current page
          clearToken();
          setIsAuthenticated(false);
        });
    }
  }, []);

  const handleNavigate = (page) => {
    if (page === 'login') {
      clearToken();
      setIsAuthenticated(false);
      setUser(null);
      setCurrentPage('login');
      return;
    }
    setCurrentPage(page);
  };

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setCurrentPage('workspace');
  };

  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <Auth onLogin={handleLogin} />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Layout currentPath={currentPage} onNavigate={handleNavigate} user={user} avatar={avatar}>
        {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentPage === 'workspace' && <Workspace />}
        {currentPage === 'history' && <History />}
        {currentPage === 'analytics' && <Analytics />}
        {currentPage === 'profile' && <Profile user={user} onAvatarChange={a => setAvatar(a)} />}
        {currentPage === 'settings' && (
          <div className="p-8">
            <h2 className="text-3xl font-display font-bold mb-4">Settings</h2>
            <p className="text-zinc-500">Configuration panel for ScanAI Enterprise.</p>
          </div>
        )}
      </Layout>
    </TooltipProvider>
  );
}
