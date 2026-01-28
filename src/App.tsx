import { useEffect, useState } from 'react';
import { useSearchParams, Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';

// דפים
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Emergency from './pages/Emergency';
import Register from './pages/Register';

function App() {
  const [searchParams] = useSearchParams();
  const bid = searchParams.get('bid'); // תופס את המספר מהלינק

  // משתנה לבדיקה אם הצמיד קיים
  const [isValidTag, setIsValidTag] = useState<boolean | null>(null);

  // --- לוגיקה 1: טיפול בצמיד (רץ רק אם יש bid) ---
  useEffect(() => {
    async function checkTag() {
      if (!bid) return;
      
      try {
        const docRef = doc(db, "users", bid); // וודא שהאוסף שלך הוא 'users' או 'patients' (תלוי מה בחרת)
        const docSnap = await getDoc(docRef);
        setIsValidTag(docSnap.exists());
      } catch (error) {
        console.error("Error checking tag:", error);
        // במקרה שגיאה נניח שזה לא קיים כדי לא לתקוע מסך
        setIsValidTag(false); 
      }
    }
    checkTag();
  }, [bid]);

  // --- החלטה 1: האם זה צמיד? ---
  if (bid) {
    // 1. עדיין בודק...
    if (isValidTag === null) {
      return (
        <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl'}}>
          <h2>🔄 מאמת נתוני צמיד...</h2>
        </div>
      );
    }
    // 2. סיים לבדוק: קיים -> חירום, לא קיים -> הרשמה
    return isValidTag ? <Emergency tagId={bid} /> : <Register tagId={bid} />;
  }

  // --- החלטה 2: אין צמיד? זה מנהל! ---
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;