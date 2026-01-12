import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from './services/firebase';

// --- התיקון: הייבוא כעת מפנה לתיקייה הנכונה ---
import AdminPanel from './pages/AdminPanel';

export default function App() {
  // --- STATE ---
  const [screen, setScreen] = useState('SPLASH');
  const [patientData, setPatientData] = useState<any>(null);
  
  // משתנים להרשמה (עדיין כאן זמנית, עד שנעביר גם אותם)
  const [braceletId, setBraceletId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<any>({ 
    name: '', personalId: '', patientPhone: '', emergencyPhone: '', story: '' 
  });

  // --- אתחול המערכת (Startup) ---
  useEffect(() => {
    const startup = async () => {
      const params = new URLSearchParams(window.location.search);
      const bid = params.get('bid');
      
      // אם אין מספר צמיד - מציג מסך ניהול
      if (!bid) { 
        setScreen('ADMIN'); 
        return; 
      }
      
      setBraceletId(bid);

      try {
        // בדיקה אם הצמיד קיים במערכת
        const q = query(collection(db, "patients"), where("braceletId", "==", bid));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          // מצאנו מבוטח! מעבר למצב חירום
          setPatientData(snap.docs[0].data());
          setScreen('EMERGENCY');
          
          // שליחת מיקום GPS
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
          // הצמיד לא מוכר - מעבר להרשמה
          setScreen('REGISTER'); 
        }
      } catch (e) { 
        console.error("Startup error:", e); 
      }
    };

    // השהייה קצרה למסך הפתיחה
    const timer = setTimeout(() => startup(), 2000);
    return () => clearTimeout(timer);
  }, []);

  // --- פונקציית הרשמה (נעביר אותה בהמשך) ---
  const handleRegister = async () => {
    if (!formData.name || !formData.personalId) return alert("חובה למלא שם ותעודת זהות");
    setIsUploading(true);
    
    try {
      let photoUrl = "";
      if (imageFile) {
        const imgRef = ref(storage, `patients/${braceletId}_${Date.now()}`);
        await uploadBytes(imgRef, imageFile);
        photoUrl = await getDownloadURL(imgRef);
      }
      
      await addDoc(collection(db, "patients"), { 
        ...formData, 
        braceletId, 
        photoUrl, 
        timestamp: serverTimestamp() 
      });
      
      window.location.reload();
    } catch (e) {
      console.error("Register error:", e);
      setIsUploading(false);
      alert("אירעה שגיאה בעת הרישום");
    }
  };

  // --- ניתוב מסכים (Routing) ---
  
  // 1. מסך ניהול (מיובא מהקובץ החיצוני)
  if (screen === 'ADMIN') {
    return <AdminPanel />;
  }

  // 2. מסך פתיחה
  if (screen === 'SPLASH') return <div style={centerS}><h1 style={{fontSize:'3.5rem', color:'#1a73e8'}}>re-co</h1><p>RECOGNITION LIVE</p></div>;

  // 3. מסך הרשמה (עדיין כאן)
  if (screen === 'REGISTER') return (
    <div style={{padding:'20px', direction:'rtl', textAlign:'center'}}>
      <h1 style={{color:'#1a73e8'}}>רישום re-co</h1>
      <div style={cardS}>
        <div onClick={() => document.getElementById('file-in')?.click()} style={{width:100, height:100, borderRadius:'50%', backgroundColor:'#eee', margin:'0 auto 20px', cursor:'pointer', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', border:'2px dashed #1a73e8'}}>
          {imagePreview ? <img src={imagePreview} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" /> : "📸 תמונה"}
        </div>
        <input id="file-in" type="file" hidden onChange={e => {
            if (e.target.files && e.target.files[0]) {
              setImageFile(e.target.files[0]);
              setImagePreview(URL.createObjectURL(e.target.files[0]));
            }
        }} />
        <input placeholder="שם מלא" style={inputS} onChange={e=>setFormData({...formData, name: e.target.value})} />
        <input placeholder="תעודת זהות" style={inputS} onChange={e=>setFormData({...formData, personalId: e.target.value})} />
        <input placeholder="טלפון שלך" style={inputS} onChange={e=>setFormData({...formData, patientPhone: e.target.value})} />
        <input placeholder="טלפון איש קשר לחירום" style={inputS} onChange={e=>setFormData({...formData, emergencyPhone: e.target.value})} />
        <textarea placeholder="רקע רפואי / הסיפור שלי" style={{...inputS, height:100}} onChange={e=>setFormData({...formData, story: e.target.value})} />
        <button onClick={handleRegister} disabled={isUploading} style={btnS}>{isUploading ? "מעלה נתונים..." : "הפעל צמיד"}</button>
      </div>
    </div>
  );

  // 4. מסך חירום (עדיין כאן)
  if (screen === 'EMERGENCY') return (
    <div style={{padding:'20px', direction:'rtl', textAlign:'center'}}>
      <h1 style={{color:'#1a73e8'}}>re-co</h1>
      <div style={{...cardS, borderTop:'10px solid red'}}>
        <h2 style={{color:'red'}}>מצב חירום!</h2>
        {patientData?.photoUrl && <img src={patientData.photoUrl} alt="" style={{width:150, height:150, borderRadius:'50%', objectFit:'cover', border:'5px solid red', marginBottom:20}} />}
        <a href={`tel:${patientData?.emergencyPhone}`} style={callBtnS}>📞 חיוג לאיש קשר</a>
        <h3>שם: {patientData?.name}</h3>
        <div style={storyS}><strong>רקע רפואי:</strong><br/>{patientData?.story}</div>
      </div>
    </div>
  );

  return null;
}

// --- סגנונות משותפים ---
const cardS: React.CSSProperties = { backgroundColor:'#fff', padding:'25px', borderRadius:'20px', boxShadow:'0 10px 25px rgba(0,0,0,0.05)', maxWidth:'500px', margin:'0 auto' };
const inputS: React.CSSProperties = { display:'block', width:'100%', padding:'12px', margin:'10px 0', borderRadius:'10px', border:'1px solid #ccc', boxSizing:'border-box' };
const btnS: React.CSSProperties = { width:'100%', padding:'15px', backgroundColor:'#1a73e8', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };
const callBtnS: React.CSSProperties = { display:'block', padding:'20px', backgroundColor:'red', color:'white', borderRadius:'15px', textDecoration:'none', fontWeight:'bold', fontSize:'1.4rem', marginBottom:'15px' };
const storyS: React.CSSProperties = { backgroundColor:'#fffde7', padding:'15px', borderRadius:'10px', borderRight:'5px solid #fbc02d', textAlign:'right', whiteSpace:'pre-line' };
const centerS: React.CSSProperties = { height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor:'#f0f4f8' };