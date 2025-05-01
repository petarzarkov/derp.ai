import { Layout } from './components/Layout';
import './index.css';
import { Route, Routes } from 'react-router-dom';
import { ChatPage } from './screens/chat/ChatPage';
import { AuthWrapper } from './auth/AuthWrapper';
import { lazy } from 'react';

const LegalPage = lazy(() => import('./screens/legal/LegalPage'));
const NotFound = lazy(() => import('./screens/NotFound'));

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/privacy-policy" element={<LegalPage />} />
        <Route path="/terms-of-service" element={<LegalPage />} />

        {/* Protected Routes */}
        <Route element={<AuthWrapper />}>
          <Route index element={<ChatPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
