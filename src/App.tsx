import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './services/firebase';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Emergency from './pages/Emergency';
import Register from './pages/Register';

function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const bid = queryParams.get('bid'); 
  
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

        // --- לוגיקה חדשה: רישום סריקה עם מיקום GPS ---
        if (exists && !hasLogged.current) {
          hasLogged.current = true;
          
          // פונקציה פנימית לרישום הלוג
          const logScanWithLocation = async (position: GeolocationPosition | null) => {
            const scanData: any = {
              action: 'SCAN',
              details: bid,
              timestamp: serverTimestamp(),
              user: 'System'
            };

            // אם הצלחנו להשיג מיקום - מוסיפים אותו
            if (position) {
              scanData.location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              scanData.accuracy = position.coords.accuracy; // שומר גם את רמת הדיוק
            }

            try {
                await addDoc(collection(db, 'system_logs'), scanData);
                console.log("Scan logged. GPS:", position ? "Yes" : "No");
            } catch (e) {
                console.error("Failed to log scan", e);
            }
          };

          // בקשת מיקום מהדפדפן
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => logScanWithLocation(position), // הצלחה
              (error) => {
                console.warn("Location access denied or failed:", error);
                logScanWithLocation(null); // כישלון - רושמים בלי מיקום
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
          } else {
            logScanWithLocation(null);
          }
        }
        // -------------------------------------------

      } catch (error) {
        console.error("Error verifying tag:", error);
        setIsValidTag(false);
      }
    }
    checkTag();
  }, [bid]);

  if (bid) {
    if (isValidTag === null) {
      return (
        <div style={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', background: '#f0f9ff'}}>
          <div style={{fontSize: '40px', marginBottom: '20px'}}>🛰️</div>
          <h3 style={{color: '#0284c7'}}>מאמת מיקום ונתונים...</h3>
          <p style={{color: '#64748b', fontSize: '12px'}}>({bid})</p>
        </div>
      );
    }
    return isValidTag ? <Emergency tagId={bid} /> : <Register tagId={bid} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;