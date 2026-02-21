import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import AdminPanel from './pages/AdminPanel';
import SplashScreen from './components/SplashScreen';
import './index.css';

const RootComponent = () => {
  // ניהול מסך הפתיחה
  const [loading, setLoading] = useState(true);

  return (
    <React.StrictMode>
      {/* הצגת מסך הפתיחה עד לסיום הטעינה */}
      {loading && <SplashScreen onFinish={() => setLoading(false)} />}

      <BrowserRouter>
        <Routes>
          {/* הכתובת הראשית מובילה ל-App, והוא כבר יחליט אם לשלוח לחירום או לרישום */}
          <Route path="/" element={<App />} />
          
          {/* נתיב ממוסך עבור מצבי חירום פעילים */}
          <Route path="/active-emergency-session" element={<App />} />

          {/* נתיב מנהל - ה-App יטפל בהרשאות */}
          <Route path="/admin" element={<AdminPanel />} />
          
          {/* במידה והכתובת לא קיימת - חוזרים הביתה */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<RootComponent />);