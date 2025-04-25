import { Layout } from './components/Layout';
import './index.css';
import { Route, Routes } from 'react-router-dom';
import ChatBox from './screens/chat/ChatBox';
import { NotFound } from './screens/NotFound';
import { AuthWrapper } from './auth/AuthWrapper';
import { LegalPage } from './screens/legal/LegalPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/privacy-policy" element={<LegalPage />} />
        <Route path="/terms-of-service" element={<LegalPage />} />

        {/* Protected Routes */}
        <Route element={<AuthWrapper />}>
          <Route index element={<ChatBox />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
