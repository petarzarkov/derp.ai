import { Layout } from './components/Layout';
import './index.css';
import { Route, Routes } from 'react-router-dom';
import ChatBox from './screens/chat/ChatBox';
import { NotFound } from './screens/NotFound';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ChatBox />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
