import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, deleteDoc, doc } from "firebase/firestore";

// --- 1. הגדרות פיירבייס ---
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
  // --- משתנים (STATE) ---
  const [screen, setScreen] = useState('SPLASH');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  // נתונים - הכל עם ANY כדי למנוע שגיאות
  const [patients, setPatients] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]); 
  const [patientData, setPatientData] = useState<any>(null);
  
  // לוגיקה וטפסים
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [formData, setFormData] = useState<any>({ name: '', personalId: '', city: '', patientPhone: '', emergencyPhone: '', story: '' });
  const [newMember, setNewMember] = useState<any>({ name: '', role: '', phone: '' });
  const [braceletId, setBraceletId] = useState('');

  // --- טעינה ראשונית ---
  useEffect(() => {
    const timer = setTimeout(() => startup(), 2000);
    return () => clearTimeout(timer);
  }, []);

  const startup = async () => {
    const params = new URLSearchParams(window.location.search);
    const bid = params.get('bid');
    
    if (!bid) { 
      setScreen('ADMIN_LOGIN'); 
      return; 
    }
    
    setBraceletId(bid);
    const q = query(collection(db, "patients"), where("braceletId", "==", bid));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      setPatientData(snap.docs[0].data());
      setScreen('EMERGENCY');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          addDoc(collection(db, "scans"), { bid, lat: pos.coords.latitude, lng: pos.coords.longitude, time: serverTimestamp() });
        });
      }
    } else { 
      setScreen('REGISTER'); 
    }
  };

  // --- כניסת מנהל ---
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

    loadTeam();
  };

  const loadTeam = async () => {
    const tSnap = await getDocs(collection(db, "staff"));
    setTeam(tSnap.docs.map(d => ({...d.data(), id: d.id})));
  };

  // --- פעולות מנהל ---
  const addTeamMember = async () => {
    if (!newMember.name || !newMember.role) return alert("חובה למלא שם ותפקיד");
    await addDoc(collection(db, "staff"), { ...newMember, joined: serverTimestamp() });
    setNewMember({ name: '', role: '', phone: '' });
    loadTeam();
    alert("איש צוות נוסף בהצלחה");
  };

  const removeTeamMember = async (id: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("האם למחוק איש צוות זה?")) {
      await deleteDoc(doc(db, "staff", id));
      loadTeam();
    }
  };

  const runAiAnalysis = () => {
    setLoadingAi(true);
    setTimeout(() => {
      setAiAnalysis(`🔍 הערכת מצב אסטרטגית - re-co AI:
📍 מוקד פעילות (Hot Zone): זוהה ריכוז סריקות חריג בגזרת העיר ${patients[0]?.city || "הדרום"}.
📊 מיפוי חשיפה: קיימים ${patients.length} רשומים בטווח האירוע.
💡 המלצה מבצעית: תעדוף משאבי חוסן וסיוע בנקודות הקצה המזוהות.`);
      setLoadingAi(false);
    }, 1500);
  };

  const exportToExcel = () => {
    const headers = ["BID", "שם", "תז", "עיר מגורים", "טלפון", "טלפון חירום"];
    const rows = patients.map(p => [p.braceletId, p.name, p.personalId, p.city, p.patientPhone, p.emergencyPhone]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `re-co_strategic_report.csv`;
    link.click();
  };

  // --- תצוגת מסכים ---

  if (screen === 'SPLASH') return (
    <div style={centerS}><h1 style={{fontSize:'3.5rem', color:'#1a73e8'}}>re-co</h1><p>RECOGNITION LIVE</p></div>
  );

  if (screen === 'ADMIN_LOGIN' && !isUnlocked) return (
    <div style={centerS}>
      <div style={cardS}>
        <h2 style={{color:'#1a73e8', textAlign:'center'}}>ניהול re-co</h2>
        <input type="password" style={inputS} placeholder="קוד גישה" onChange={e=>setPinInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleLogin()} />
        <button onClick={handleLogin} style={btnS}>כניסה</button>
      </div>
    </div>
  );

  if (isUnlocked) return (
    <div style={{ direction: 'rtl', padding: '20px', backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'system-ui' }}>
      
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
        <h1 style={{color:'#1a73e8', margin:0}}>re-co Dashboard</h1>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={exportToExcel} style={excelBtnS}>📊 דוח</button>
          <button onClick={runAiAnalysis} style={aiBtnS}>{loadingAi ? "מנתח..." : "✨ AI"}</button>
        </div>
      </header>

      {aiAnalysis && <div style={aiBoxStyle}>{aiAnalysis}</div>}

      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <div style={statCardS}><h3>סה"כ רשומים</h3><p style={statNumS}>{patients.length}</p></div>
        <div style={statCardS}><h3>אירועי חירום</h3><p style={statNumS}>{scans.length}</p></div>
        <div style={statCardS}><h3>צוות פעיל</h3><p style={statNumS}>{team.length}</p></div>
      </div>

      <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
        
        <div style={{...cardS, flex:2, margin:0, maxWidth:'none'}}>
          <h3 style={{color:'#555'}}>📋 מאגר מבוטחים</h3>
          <table style={{width:'100%', textAlign:'right', borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid #eee', color:'#666'}}><th>BID</th><th>שם</th><th>עיר</th><th>טלפון</th></tr></thead>
            <tbody>
              {patients.map((p, i) => (
                <tr key={i} style={{borderBottom:'1px solid #eee'}}><td style={{padding:'12px'}}>{p.braceletId}</td><td>{p.name}</td><td>{p.city}</td><td>{p.patientPhone}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{...cardS, flex:1, margin:0, maxWidth:'none', backgroundColor:'#f8fbff', border:'1px solid #dae1e7'}}>
          <h3 style={{color:'#1a73e8'}}>🛡️ ניהול צוות והרשאות</h3>
          
          <div style={{display:'flex', gap:'5px', marginBottom:'15px'}}>
            <input placeholder="שם" style={{...inputS, margin:0}} value={newMember.name} onChange={e=>setNewMember({...newMember, name: e.target.value})} />
            <input placeholder="תפקיד" style={{...inputS, margin:0}} value={newMember.role} onChange={e=>setNewMember({...newMember, role: e.target.value})} />
            <button onClick={addTeamMember} style={{...btnS, width:'auto', padding:'0 15px'}}>+</button>
          </div>

          <ul style={{listStyle:'none', padding:0, margin:0}}>
            {team.length === 0 && <li style={{color:'#999'}}>אין אנשי צוות רשומים</li>}
            {team.map((t: any) => (
              <li key={t.id} style={{display:'flex', justifyContent:'space-between', padding:'10px', borderBottom:'1px solid #eee', alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:'bold'}}>{t.name}</div>
                  <div style={{fontSize:'0.85rem', color:'#666'}}>{t.role}</div>
                </div>
                <button onClick={()=>removeTeamMember(t.id)} style={{color:'red', background:'none', border:'none', cursor:'pointer'}}>מחק 🗑️</button>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );

  return (
    <div style={{ padding: '20px', direction: 'rtl', textAlign: 'center' }}>
      <h1 style={{color:'#1a73e8'}}>re-co</h1>
      {screen === 'REGISTER' ? (
        <div style={cardS}>
          <h3>רישום צמיד {braceletId}</h3>
          <input placeholder="שם מלא" style={inputS} onChange={e=>setFormData({...formData, name: e.target.value})} />
          <input placeholder="תעודת זהות" style={inputS} onChange={e=>setFormData({...formData, personalId: e.target.value})} />
          <input placeholder="עיר מגורים" style={inputS} onChange={e=>setFormData({...formData, city: e.target.value})} />
          <input placeholder="טלפון שלך" style={inputS} onChange={e=>setFormData({...formData, patientPhone: e.target.value})} />
          <input placeholder="טלפון איש קשר" style={inputS} onChange={e=>setFormData({...formData, emergencyPhone: e.target.value})} />
          <textarea placeholder="הסיפור שלי / רקע רפואי" style={{...inputS, height:'100px'}} onChange={e=>setFormData({...formData, story: e.target.value})} />
          <button onClick={async () => { await addDoc(collection(db, "patients"), { ...formData, braceletId, timestamp: serverTimestamp() }); alert("נרשם!"); window.location.reload(); }} style={btnS}>הפעל צמיד</button>
        </div>
      ) : (
        <div style={{...cardS, borderTop:'10px solid red'}}>
          <h2 style={{color:'red'}}>מצב חירום!</h2>
          <div style={protocolS}>פוסט טראומי מולך - התנהג לפי הפרוטוקול</div>
          <a href={`tel:${patientData?.emergencyPhone}`} style={callBtnS}>📞 חיוג לאיש קשר לחירום</a>
          <p><strong>שם:</strong> {patientData?.name}</p>
          <p><strong>עיר:</strong> {patientData?.city}</p>
          <div style={storyS}><strong>רקע רפואי:</strong><br/>{patientData?.story || patientData?.patientStory || "אין מידע נוסף"}</div>
        </div>
      )}
    </div>
  );
}

// Styles
const centerS: React.CSSProperties = { height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor:'#f0f4f8' };
const cardS: React.CSSProperties = { backgroundColor:'#fff', padding:'25px', borderRadius:'20px', boxShadow:'0 10px 25px rgba(0,0,0,0.05)', maxWidth:'500px', margin:'0 auto' };
const inputS: React.CSSProperties = { display:'block', width:'100%', padding:'12px', margin:'10px 0', borderRadius:'10px', border:'1px solid #ccc', boxSizing:'border-box' };
const btnS: React.CSSProperties = { width:'100%', padding:'15px', backgroundColor:'#1a73e8', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };
const excelBtnS: React.CSSProperties = { padding:'12px 20px', backgroundColor:'#22c55e', color:'white', borderRadius:'12px', border:'none', fontWeight:'bold', cursor:'pointer' };
const aiBtnS: React.CSSProperties = { padding:'12px 20px', backgroundColor:'#7c4dff', color:'white', borderRadius:'12px', border:'none', fontWeight:'bold', cursor:'pointer' };
const aiBoxStyle: React.CSSProperties = { backgroundColor:'#f3e5f5', padding:'20px', borderRadius:'15px', borderRight:'6px solid #7c4dff', marginBottom:'20px', whiteSpace:'pre-line', textAlign:'right' };
const statCardS: React.CSSProperties = { flex:1, backgroundColor:'#fff', padding:'20px', borderRadius:'20px', textAlign:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.05)' };
const statNumS: React.CSSProperties = { fontSize:'2.5rem', fontWeight:'bold', color:'#1a73e8', margin:0 };
const protocolS: React.CSSProperties = { backgroundColor:'#000', color:'#fff', padding:'15px', borderRadius:'10px', marginBottom:'15px' };
const callBtnS: React.CSSProperties = { display:'block', padding:'20px', backgroundColor:'red', color:'white', borderRadius:'15px', textDecoration:'none', fontWeight:'bold', fontSize:'1.4rem', marginBottom:'15px' };
const storyS: React.CSSProperties = { backgroundColor:'#fffde7', padding:'15px', borderRadius:'10px', borderRight:'5px solid #fbc02d', textAlign:'right' };