import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './services/firebase';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Register from './pages/Register';
import Emergency from './pages/Emergency';

// התיקון כאן: שיניתי את הסוג ל-any כדי למנוע את השגיאה האדומה
const PrivateRoute = ({ children }: { children: any }) => {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>טוען...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <Routes>
      {/* נתיבים ציבוריים */}
      <Route path="/tag/:id" element={<Emergency />} />
      <Route path="/scan/:id" element={<Emergency />} />
      <Route path="/login" element={<Login />} />

      {/* נתיבים פרטיים */}
      <Route path="/" element={
        <PrivateRoute>
          <AdminPanel />
        </PrivateRoute>
      } />
      
      <Route path="/register" element={
        <PrivateRoute>
          <Register />
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;