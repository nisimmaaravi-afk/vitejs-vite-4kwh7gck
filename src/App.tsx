import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from './services/firebase';

// ייבוא כל המסכים שלנו
import AdminPanel from './pages/AdminPanel';
import Register from './pages/Register';
import Emergency from './pages/Emergency';

export default function App() {
  // --- STATE ---
  // הקובץ הראשי מנהל רק שני דברים:
  // 1. באיזה מסך אנחנו נמצאים? (screen)
  // 2. איזה מידע שלפנו מהדאטהבייס? (patientData)
  
  const [screen, setScreen] = useState('SPLASH');
  const [patientData, setPatientData] = useState<any>(null);
  const [braceletId, setBraceletId] = useState(''); 

  // --- אתחול המערכת (Startup Logic) ---
  useEffect(() => {
    const startup = async () => {
      const params = new URLSearchParams(window.location.search);
      const bid = params.get('bid');
      
      // אין צמיד? לך למנהל
      if (!bid) { 
        setScreen('ADMIN'); 
        return; 
      }
      
      setBraceletId(bid);

      try {
        // חיפוש הצמיד בבסיס הנתונים
        const q = query(collection(db, "patients"), where("braceletId", "==", bid));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          // --- תרחיש 1: הצמיד קיים (חירום) ---
          setPatientData(snap.docs[0].data());
          setScreen('EMERGENCY');
          
          // דיווח מיקום GPS ברקע
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
              addDoc(collection(db, "scans"), { 
                bid, 
                lat: pos.coords.latitude, 
                lng: pos.coords.longitude, 
                time: serverTimestamp()
              });
            });
          }
        } else { 
          // --- תרחיש 2: הצמיד חדש (הרשמה) ---
          setScreen('REGISTER'); 
        }
      } catch (e) { 
        console.error("Startup error:", e); 
      }
    };

    // השהייה קטנה למיתוג (בשביל הלוגו בהתחלה)
    const timer = setTimeout(() => startup(), 2000);
    return () => clearTimeout(timer);
  }, []);

  // --- ניתוב מסכים (Routing) ---
  // תראה כמה זה נקי עכשיו! כל מסך מקבל שורה אחת.

  if (screen === 'ADMIN') return <AdminPanel />;

  if (screen === 'REGISTER') return <Register braceletId={braceletId} />;

  if (screen === 'EMERGENCY') return <Emergency patientData={patientData} />;

  // מסך הפתיחה (Splash Screen)
  return (
    <div style={centerS}>
      <h1 style={{fontSize:'3.5rem', color:'#1a73e8'}}>re-co</h1>
      <p style={{color:'#666', letterSpacing:'2px'}}>RECOGNITION LIVE</p>
    </div>
  );
}

// סגנון יחיד שנשאר פה (בשביל מסך הפתיחה)
const centerS: React.CSSProperties = { height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor:'#f0f4f8', fontFamily:'system-ui' };