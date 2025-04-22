import { Layout } from './components/Layout';
import './index.css';
import { Route, Routes } from 'react-router-dom';
import ChatBox from './screens/chat/ChatBox';
import { NotFound } from './screens/NotFound';
import { PrivacyPolicy } from './screens/PrivacyPolicy';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ChatBox />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
