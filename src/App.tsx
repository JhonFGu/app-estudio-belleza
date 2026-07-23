import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { canAccessTab } from './utils/permissions';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { CRMPage } from './pages/CRMPage';
import { POSPage } from './pages/POSPage';
import { TreatmentsPage } from './pages/TreatmentsPage';
import { CollaboratorsPage } from './pages/CollaboratorsPage';
import { SchedulePage } from './pages/SchedulePage';
import { HistoryPage } from './pages/HistoryPage';
import { MessagesPage } from './pages/MessagesPage';
import { FinancePage } from './pages/FinancePage';
import { InventoryPage } from './pages/InventoryPage';
import { UsersPage } from './pages/UsersPage';
import { CompanySettingsPage } from './pages/CompanySettingsPage';
import { UserProfileModal } from './components/users/UserProfileModal';

function App() {
  const navigate = useNavigate();
  const initialize = useAppStore((state) => state.initialize);
  const currentTab = useAppStore((state) => state.currentTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const isProfileModalOpen = useAppStore((state) => state.isProfileModalOpen);
  const setProfileModalOpen = useAppStore((state) => state.setProfileModalOpen);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!currentUser && !localStorage.getItem('aura_session')) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);

  const renderContent = () => {
    if (currentUser && !canAccessTab(currentUser, currentTab)) {
      return <DashboardPage />;
    }
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'crm':
        return <CRMPage />;
      case 'pos':
        return <POSPage />;
      case 'treatments':
        return <TreatmentsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'collaborators':
        return <CollaboratorsPage />;
      case 'users':
        return <UsersPage />;
      case 'company':
        return <CompanySettingsPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'history':
        return <HistoryPage />;
      case 'messages':
        return <MessagesPage />;
      case 'finance':
        return <FinancePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <Layout>
        {renderContent()}
      </Layout>
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />
    </>
  );
}

export default App;
