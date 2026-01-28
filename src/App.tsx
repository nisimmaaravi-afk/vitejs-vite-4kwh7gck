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

  // בדיקת צמיד מול פיירבייס
  useEffect(() => {
    async function checkTag() {
      if (!bid) return;
      try {
        const docRef = doc(db, "users", bid);
        const docSnap = await getDoc(docRef);
        setIsValidTag(docSnap.exists());
      } catch (error) {
        console.error("Error:", error);
      }
    }
    checkTag();
  }, [bid]);

  // --- תרחיש צמיד ---
  if (bid) {
    if (isValidTag === null) return <div style={{textAlign:'center', marginTop: 50}}>🔄 טוען...</div>;
    // כאן אנחנו מעבירים את ה-tagId, ולכן חייבים לעדכן את הדפים למטה (שלב 3 ו-4)
    return isValidTag ? <Emergency tagId={bid} /> : <Register tagId={bid} />;
  }

  // --- תרחיש מנהל ---
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;