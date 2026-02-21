import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './services/firebase';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Emergency from './pages/Emergency';
import Register from './pages/Register';

function App() {
  // שמירת ה-ID בסטייט כדי שישרוד את מחיקת ה-URL (אבטחה)
  const [bid] = useState(() => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('bid');
  }); 
  
  const [isValidTag, setIsValidTag] = useState<boolean | null>(null);
  const hasLogged = useRef(false);

  useEffect(() => {
    async function checkTag() {
      if (!bid) return;

      try {
        const docRef = doc(db, "users", bid);
        const docSnap = await getDoc(docRef);
        const exists = docSnap.exists();
        
        setIsValidTag(exists);

        // לוגיקה לרישום סריקה בזמן אמת עם מיקום GPS (עבור האדמין)
        if (exists && !hasLogged.current) {
          hasLogged.current = true;
          
          const logScanWithLocation = async (position: GeolocationPosition | null) => {
            const scanData: any = {
              action: 'SCAN',
              details: bid,
              timestamp: serverTimestamp(),
              user: 'System'
            };

            if (position) {
              scanData.location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              scanData.accuracy = position.coords.accuracy;
            }

            try {
                await addDoc(collection(db, 'system_logs'), scanData);
                console.log("Scan logged. GPS:", position ? "Yes" : "No");
            } catch (e) {
                console.error("Failed to log scan", e);
            }
          };

          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => logScanWithLocation(position),
              () => logScanWithLocation(null),
              { enableHighAccuracy: true, timeout: 5000 }
            );
          } else {
            logScanWithLocation(null);
          }
        }
      } catch (error) {
        console.error("Error verifying tag:", error);
        setIsValidTag(false);
      }
    }
    checkTag();
  }, [bid]);

  // אם יש צמיד ב-URL, אנחנו במצב שטח (סריקה)
  if (bid) {
    if (isValidTag === null) {
      return (
        <div style={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', background: '#f0f9ff'}}>
          <div style={{fontSize: '40px', marginBottom: '20px'}}>🛰️</div>
          <h3 style={{color: '#0284c7'}}>מאמת נתונים...</h3>
        </div>
      );
    }
    // כאן ה-App מעביר את ה-tagId לקומפוננטות - לכן אין שגיאת TypeScript
    return isValidTag ? <Emergency tagId={bid} /> : <Register tagId={bid} />;
  }

  // אם אין צמיד ב-URL, מציגים את נתיבי המערכת (Login / Admin)
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminPanel />} />
      {/* הגנה נוספת לכל מקרה */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;