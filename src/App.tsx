import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Emergency from './pages/Emergency';
import Register from './pages/Register';

function App() {
  // שינוי קריטי: אנחנו קוראים את הכתובת ישירות מהדפדפן, לא דרך הראוטר
  // זה מבטיח שאף אחד לא יפספס את ה-bid
  const queryParams = new URLSearchParams(window.location.search);
  const bid = queryParams.get('bid'); 

  const [isValidTag, setIsValidTag] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkTag() {
      if (!bid) return;

      try {
        const docRef = doc(db, "users", bid);
        const docSnap = await getDoc(docRef);
        setIsValidTag(docSnap.exists());
      } catch (error) {
        console.error("Error verifying tag:", error);
        setIsValidTag(false);
      }
    }
    checkTag();
  }, [bid]);

  // ============================================
  // מחסום ברזל: אם יש bid בשורת הכתובת - המערכת נעולה עליו
  // ============================================
  if (bid) {
    // 1. שלב טעינה
    if (isValidTag === null) {
      return (
        <div style={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif'}}>
          <div style={{fontSize: '40px', marginBottom: '20px'}}>🛡️</div>
          <h3>מאמת צמיד... ({bid})</h3>
        </div>
      );
    }
    
    // 2. ההחלטה: הרשמה או חירום
    return isValidTag ? <Emergency tagId={bid} /> : <Register tagId={bid} />;
  }

  // ============================================
  // רק אם ה-bid ריק לגמרי - תציג את המנהל
  // ============================================
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;