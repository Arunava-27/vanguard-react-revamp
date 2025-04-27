// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


import { store } from './redux/store';
import WebSocketManager from './components/WebSocketManager';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import NetworkMap from './pages/NetworkMap';
import LogMonitor from './pages/LogMonitor';
import FlowDetail from './pages/FlowDetail';
import Alerts from './pages/Alerts';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Router>
          <WebSocketManager />
          <div className="flex h-screen bg-gray-100">
            <Navbar />
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/network" element={<NetworkMap />} />
                <Route path="/logs" element={<LogMonitor />} />
                <Route path="/flow/:flowId" element={<FlowDetail />} />
                <Route path="/alerts" element={<Alerts />} />
              </Routes>
            </div>
          </div>
          <ToastContainer position="top-right" autoClose={5000} />
        </Router>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;