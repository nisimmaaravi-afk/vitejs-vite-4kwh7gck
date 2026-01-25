import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import Register from './pages/Register'
import AdminPanel from './pages/AdminPanel'
import SplashScreen from './components/SplashScreen' // ייבוא המסך החדש
import './index.css'

const RootComponent = () => {
  // משתנה שקובע: האם אנחנו עדיין בשלב הטעינה?
  const [loading, setLoading] = useState(true);

  return (
    <React.StrictMode>
      {/* אם אנחנו בטעינה - הצג את מסך הפתיחה */}
      {loading && <SplashScreen onFinish={() => setLoading(false)} />}

      {/* האפליקציה עצמה (נטענת ברקע) */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<RootComponent />);