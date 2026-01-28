import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './services/firebase';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Emergency from './pages/Emergency';
import Register from './pages/Register';

function App() {
  // קריאת הפרמטר ישירות מה-URL
  const queryParams = new URLSearchParams(window.location.search);
  const bid = queryParams.get('bid'); 
  
  const [isValidTag, setIsValidTag] = useState<boolean | null>(null);
  const hasLogged = useRef(false); // מונע כתיבה כפולה של אותו לוג

  useEffect(() => {
    async function checkTag() {
      if (!bid) return;

      try {
        const docRef = doc(db, "users", bid);
        const docSnap = await getDoc(docRef);
        const exists = docSnap.exists();
        
        setIsValidTag(exists);

        // --- התיקון: דיווח על הסריקה למסד הנתונים ---
        if (exists && !hasLogged.current) {
          hasLogged.current = true; // סימון שדיווחנו כדי לא לשכפל
          await addDoc(collection(db, 'system_logs'), {
            action: 'SCAN',
            details: bid, // שומרים את מספר הצמיד שנסרק
            timestamp: serverTimestamp(), // שומרים את הזמן המדויק
            user: 'System'
          });
          console.log("Scan logged successfully");
        }
        // -------------------------------------------

      } catch (error) {
        console.error("Error verifying tag:", error);
        setIsValidTag(false);
      }
    }
    checkTag();
  }, [bid]);

  // ============================================
  // מחסום ברזל: אם יש מספר צמיד - המערכת נעולה עליו
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
  // רק אם ה-bid ריק - תציג את המנהל
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