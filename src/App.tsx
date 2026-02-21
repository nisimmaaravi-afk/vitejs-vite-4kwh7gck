import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './services/firebase';

import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Emergency from './pages/Emergency';
import Register from './pages/Register';

function App() {
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

        if (exists && !hasLogged.current) {
          hasLogged.current = true;
          const logScan = async (pos: GeolocationPosition | null) => {
            await addDoc(collection(db, 'system_logs'), {
              action: 'SCAN',
              details: bid,
              timestamp: serverTimestamp(),
              user: 'System',
              location: pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null
            });
          };
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(logScan, () => logScan(null));
          } else { logScan(null); }
        }
      } catch (e) { setIsValidTag(false); }
    }
    checkTag();
  }, [bid]);

  if (bid) {
    if (isValidTag === null) return <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>טוען...</div>;
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