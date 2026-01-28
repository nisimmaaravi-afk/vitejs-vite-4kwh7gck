import { useEffect, useState } from 'react';
import { useSearchParams, Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Emergency from './pages/Emergency';
import Register from './pages/Register';

function App() {
  const [searchParams] = useSearchParams();
  const bid = searchParams.get('bid'); 
  
  const [isValidTag, setIsValidTag] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkTag() {
      // אם אין מספר, אל תעשה כלום
      if (!bid) return;

      try {
        // שים לב: בודק באוסף users
        const docRef = doc(db, "users", bid);
        const docSnap = await getDoc(docRef);
        setIsValidTag(docSnap.exists());
      } catch (error) {
        console.error("Error verifying tag:", error);
        // במקרה של שגיאה, נניח שצריך להירשם (Safety Fallback)
        setIsValidTag(false);
      }
    }
    checkTag();
  }, [bid]);

  // ============================================
  // מחסום ברזל: אם יש מספר צמיד - טפל רק בו!
  // ============================================
  if (bid) {
    // 1. שלב טעינה (מציג מסך לבן נקי עם טעינה)
    if (isValidTag === null) {
      return (
        <div style={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif'}}>
          <div style={{fontSize: '40px', marginBottom: '20px'}}>🛡️</div>
          <h3>מאמת צמיד...</h3>
        </div>
      );
    }
    
    // 2. ההחלטה: הרשמה או חירום
    return isValidTag ? <Emergency tagId={bid} /> : <Register tagId={bid} />;
  }

  // ============================================
  // רק אם אין צמיד - תציג את הראוטר הרגיל
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