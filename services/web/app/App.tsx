import { Layout } from './components/Layout';
import './index.css';
import { Route, Routes } from 'react-router-dom';
import ChatBox from './screens/chat/ChatBox';
import { NotFound } from './screens/NotFound';
import { PrivacyPolicy } from './screens/PrivacyPolicy';
import { AuthWrapper } from './auth/AuthWrapper';

interface AppProps {
  serverUrl: string;
}

const App: React.FC<AppProps> = ({ serverUrl }) => {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Protected Routes */}
        <Route element={<AuthWrapper serverUrl={serverUrl} />}>
          <Route index element={<ChatBox />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
