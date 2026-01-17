import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from './services/firebase';

import AdminPanel from './pages/AdminPanel';
import Register from './pages/Register';
import Emergency from './pages/Emergency';

export default function App() {
  const [screen, setScreen] = useState('SPLASH');
  const [patientData, setPatientData] = useState<any>(null);
  const [braceletId, setBraceletId] = useState(''); 

  useEffect(() => {
    const startup = async () => {
      const params = new URLSearchParams(window.location.search);
      const bid = params.get('bid');
      
      if (!bid) { 
        setScreen('ADMIN'); 
        return; 
      }
      
      setBraceletId(bid);

      try {
        const q = query(collection(db, "patients"), where("braceletId", "==", bid));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setPatientData(snap.docs[0].data());
          setScreen('EMERGENCY');
          
          // --- תיקון: בקשת מיקום בדיוק גבוה (High Accuracy) ---
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                // הצלחה - שולח מיקום מדויק
                addDoc(collection(db, "scans"), { 
                  bid, 
                  lat: pos.coords.latitude, 
                  lng: pos.coords.longitude, 
                  time: serverTimestamp(),
                  accuracy: pos.coords.accuracy // שומרים גם את רמת הדיוק למקרה שנרצה לבדוק
                });
              },
              (err) => {
                console.error("GPS Error:", err);
                // במקרה של שגיאה במיקום, נרשום את הסריקה בלי מיקום
                addDoc(collection(db, "scans"), { bid, time: serverTimestamp(), error: "GPS failed" });
              },
              {
                enableHighAccuracy: true, // זה הטריגר שמפעיל GPS לווייני
                timeout: 10000,           // מחכה עד 10 שניות לקליטה טובה
                maximumAge: 0             // לא משתמש במיקום ישן מהזיכרון
              }
            );
          }
        } else { 
          setScreen('REGISTER'); 
        }
      } catch (e) { 
        console.error("Startup error:", e); 
      }
    };

    const timer = setTimeout(() => startup(), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (screen === 'ADMIN') return <AdminPanel />;

  if (screen === 'REGISTER') return <Register braceletId={braceletId} />;

  if (screen === 'EMERGENCY') return <Emergency patientData={patientData} />;

  return (
    <div style={{height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor:'#f0f4f8', fontFamily:'system-ui'}}>
      <h1 style={{fontSize:'3.5rem', color:'#1a73e8'}}>re-co</h1>
      <p style={{color:'#666', letterSpacing:'2px'}}>RECOGNITION LIVE</p>
    </div>
  );
}