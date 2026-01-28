import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import Emergency from './pages/Emergency';
import Register from './pages/Register';

export default function TagDispatcher() {
  const [searchParams] = useSearchParams();
  const bid = searchParams.get('bid'); // שואב את המספר 1001 מהלינק
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkTag() {
      if (!bid) return;
      try {
        // בודק בפיירבייס אם הצמיד קיים
        const docRef = doc(db, "users", bid);
        const docSnap = await getDoc(docRef);
        setExists(docSnap.exists());
      } catch (error) {
        console.error("Error checking tag:", error);
      }
    }
    checkTag();
  }, [bid]);

  // מצבי ביניים
  if (!bid) return <div style={{textAlign:'center', marginTop: 50, fontSize: 20}}>❌ נא לסרוק ברקוד תקין (חסר מספר צמיד)</div>;
  if (exists === null) return <div style={{textAlign:'center', marginTop: 50, fontSize: 20}}>🔄 בודק נתונים...</div>;

  // ההחלטה: אם קיים -> חירום. אם לא -> הרשמה.
  return exists ? <Emergency tagId={bid} /> : <Register tagId={bid} />;
}