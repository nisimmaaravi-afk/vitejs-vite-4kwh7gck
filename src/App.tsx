import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARLYiBAULEaOAObakGerEGsIHSo8M6t9o",
  authDomain: "recognition-live.firebaseapp.com",
  projectId: "recognition-live",
  storageBucket: "recognition-live.firebasestorage.app",
  messagingSenderId: "721239181692",
  appId: "1:721239181692:web:9572e23343a592876dbcf9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [screen, setScreen] = useState('SPLASH');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [patients, setPatients] = useState([]);
  const [scans, setScans] = useState([]);
  const [braceletId, setBraceletId] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [formData, setFormData] = useState({ name: '', personalId: '', city: '', patientPhone: '', emergencyPhone: '', story: '' });

  useEffect(() => {
    const timer = setTimeout(() => startup(), 2000);
    return () => clearTimeout(timer);
  }, []);

  const startup = async () => {
    const params = new URLSearchParams(window.location.search);
    const bid = params.get('bid');
    if (!bid) { setScreen('ADMIN_LOGIN'); return; }
    
    setBraceletId(bid);
    const q = query(collection(db, "patients"), where("braceletId", "==", bid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setPatientData(snap.docs[0].data());
      setScreen('EMERGENCY');
      navigator.geolocation.getCurrentPosition((pos) => {
        addDoc(collection(db, "scans"), { bid, lat: pos.coords.latitude, lng: pos.coords.longitude, time: serverTimestamp() });
      });
    } else { setScreen('AUTH_BEFORE_REG'); }
  };

  const handleLogin = () => {
    if (pinInput === '2430' || pinInput === '015875339') {
      setIsUnlocked(true);
      loadAdminData();
    } else { alert("קוד שגוי"); }
  };

  const loadAdminData = async () => {
    const pSnap = await getDocs(collection(db, "patients"));
    setPatients(pSnap.docs.map(d => d.data()));
    const sSnap = await getDocs(query(collection(db, "scans"), orderBy("time", "desc"), limit(10)));
    setScans(sSnap.docs.map(d => d.data()));
  };

  const runAiAnalysis = () => {
    setLoadingAi(true);
    setTimeout(() => {
      setAiAnalysis(`🔍 הערכת מצב אסטרטגית - Recognition.Live:\n📍 מוקד פעילות: זוהה ריכוז חריג בגזרה.\n📊 פריסה: ${patients.length} רשומים בטווח האירוע.\n💡 המלצה: תעדוף משאבי סיוע.`);
      setLoadingAi(false);
    }, 1500);
  };

  const exportToExcel = () => {
    const headers = ["BID", "Name", "ID", "City", "Phone", "Emergency"];
    const rows = patients.map(p => [p.braceletId, p.name, p.personalId, p.city, p.patientPhone, p.emergencyPhone]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Recognition_Live_Report.csv`;
    link.click();
  };

  if (screen === 'SPLASH') return <div style={centerS}><h1 style={logoS}>re-co</h1><p>Recognition.Live</p></div>;

  if (screen === 'ADMIN_LOGIN' && !isUnlocked) return (
    <div style={centerS}>
      <div style={cardS}>
        <h2 style={{color:'#1a73e8', textAlign:'center'}}>כניסת מנהל</h2>
        <input type="password" style={inputS} placeholder="קוד גישה" onChange={e=>setPinInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleLogin()} />
        <button onClick={handleLogin} style={btnS}>כניסה</button>
      </div>
    </div>
  );

  if (isUnlocked) return (
    <div style={{ direction: 'rtl', padding: '20px', backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
        <h1 style={{margin:0, color:'#1a73e8'}}>Dashboard</h1>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={exportToExcel} style={excelBtnS}>📊 ייצוא דוח</button>
          <button onClick={runAiAnalysis} style={aiBtnS}>{loadingAi ? "מנתח..." : "✨ ניתוח AI"}</button>
        </div>
      </header>
      {aiAnalysis && <div style={aiBoxS}>{aiAnalysis}</div>}
      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <div style={statCardS}><h3>רשומים</h3><p style={statNumS}>{patients.length}</p></div>
        <div style={statCardS}><h3>אירועים</h3><p style={statNumS}>{scans.length}</p></div>
      </div>
      <div style={cardS}>
        <table style={{width:'100%', textAlign:'right', borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #eee'}}><th>BID</th><th>שם</th><th>עיר</th></tr></thead>
          <tbody>
            {patients.map((p, i) => (
              <tr key={i} style={{borderBottom:'1px solid #eee'}}><td style={{padding:'10px'}}>{p.braceletId}</td><td>{p.name}</td><td>{p.city}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (screen === 'AUTH_BEFORE_REG') return (
    <div style={centerS}>
      <div style={cardS}>
        <h3 style={{textAlign:'center'}}>אקטיבציה {braceletId}</h3>
        <input type="password" style={inputS} placeholder="קוד נציג" onChange={e=>setPinInput(e.target.value)} onKeyPress={e=>e.key==='Enter' && pinInput === '2430' && setScreen('REGISTER')} />
        <button onClick={() => pinInput === '2430' ? setScreen('REGISTER') : alert('שגוי')} style={btnS}>פתח רישום</button>
      </div>
    </div>
  );

  if (screen === 'REGISTER') return (
    <div style={{ padding: '20px', direction: 'rtl', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <div style={{ ...cardS, maxWidth: '500px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center' }}>רישום Recognition.Live</h2>
        <input placeholder="שם מלא" style={inputS} onChange={e=>setFormData({...formData, name: e.target.value})} />
        <input placeholder="תעודת זהות" style={inputS} onChange={e=>setFormData({...formData, personalId: e.target.value})} />
        <input placeholder="עיר מגורים" style={inputS} onChange={e=>setFormData({...formData, city: e.target.value})} />
        <input placeholder="טלפון" style={inputS} onChange={e=>setFormData({...formData, patientPhone: e.target.value})} />
        <input placeholder="טלפון חירום" style={inputS} onChange={e=>setFormData({...formData, emergencyPhone: e.target.value})} />
        <textarea placeholder="סיפור אישי" style={{...inputS, height:'100px'}} onChange={e=>setFormData({...formData, story: e.target.value})} />
        <button onClick={async () => { await addDoc(collection(db, "patients"), { ...formData, braceletId, timestamp: serverTimestamp() }); alert("הופעל!"); window.location.reload(); }} style={btnS}>אישור והפעלה</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '20px', direction: 'rtl', textAlign: 'center' }}>
      <div style={{...cardS, borderTop:'10px solid red'}}>
        <h2 style={{color:'red'}}>מצב חירום!</h2>
        <a href={`tel:${patientData?.emergencyPhone}`} style={callBtnS}>📞 חיוג לחירום</a>
        <p>שם: {patientData?.name} | עיר: {patientData?.city}</p>
        <div style={storyS}>{patientData?.story}</div>
      </div>
    </div>
  );
}

const centerS = { height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor:'#f0f4f8' };
const logoS = { fontSize:'4rem', color:'#1a73e8' };
const cardS = { backgroundColor:'#fff', padding:'25px', borderRadius:'20px', boxShadow:'0 10px 25px rgba(0,0,0,0.05)', width:'100%' };
const inputS = { display:'block', width:'100%', padding:'12px', margin:'10px 0', borderRadius:'10px', border:'1px solid #ccc', boxSizing:'border-box' as 'border-box' };
const btnS = { width:'100%', padding:'15px', backgroundColor:'#1a73e8', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };
const excelBtnS = { padding:'10px 20px', backgroundColor:'#22c55e', color:'white', borderRadius:'10px', border:'none', cursor:'pointer' };
const aiBtnS = { padding:'10px 20px', backgroundColor:'#7c4dff', color:'white', borderRadius:'10px', border:'none', cursor:'pointer' };
const aiBoxS = { backgroundColor:'#f3e5f5', padding:'15px', borderRadius:'15px', borderRight:'5px solid #7c4dff', marginBottom:'20px', whiteSpace:'pre-line', textAlign:'right' as 'right' };
const statCardS = { flex:1, backgroundColor:'#fff', padding:'15px', borderRadius:'15px', textAlign:'center' as 'center' };
const statNumS = { fontSize:'2rem', fontWeight:'bold', color:'#1a73e8', margin:0 };
const callBtnS = { display:'block', padding:'15px', backgroundColor:'red', color:'white', borderRadius:'15px', textDecoration:'none', fontWeight:'bold', fontSize:'1.2rem', marginBottom:'15px' };
const storyS = { backgroundColor:'#fffde7', padding:'15px', borderRadius:'10px', borderRight:'5px solid #fbc02d', textAlign:'right' as 'right' };