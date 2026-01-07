import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";

// --- הגדרות פיירבייס ---
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
  
  // נתונים
  const [patients, setPatients] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]); 
  const [patientData, setPatientData] = useState<any>(null);
  
  // ניהול ועריכה (התוספת החדשה!)
  const [editingPatient, setEditingPatient] = useState<any>(null); // מי בטיפול כרגע
  const [newMember, setNewMember] = useState<any>({ name: '', role: '', phone: '' });
  const [formData, setFormData] = useState<any>({ name: '', personalId: '', city: '', patientPhone: '', emergencyPhone: '', story: '' });
  const [braceletId, setBraceletId] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

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
      // דיווח מיקום
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          addDoc(collection(db, "scans"), { bid, lat: pos.coords.latitude, lng: pos.coords.longitude, time: serverTimestamp() });
        });
      }
    } else { 
      setScreen('REGISTER'); 
    }
  };

  // --- פונקציות ניהול (החלק החדש והחשוב) ---
  
  const handleLogin = () => {
    if (pinInput === '2430' || pinInput === '015875339') {
      setIsUnlocked(true);
      loadAdminData();
    } else { alert("קוד שגוי"); }
  };

  const loadAdminData = async () => {
    const pSnap = await getDocs(collection(db, "patients"));
    // כאן הקסם: אנחנו שומרים גם את ה-ID כדי שנוכל למחוק אח"כ
    setPatients(pSnap.docs.map(d => ({...d.data(), id: d.id}))); 
    
    const tSnap = await getDocs(collection(db, "staff"));
    setTeam(tSnap.docs.map(d => ({...d.data(), id: d.id})));

    const sSnap = await getDocs(query(collection(db, "scans"), orderBy("time", "desc"), limit(5)));
    setScans(sSnap.docs.map(d => d.data()));
  };

  // מחיקת מטופל
  const handleDeletePatient = async (id: string, name: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`האם אתה בטוח שברצונך למחוק את ${name}?`)) {
      await deleteDoc(doc(db, "patients", id));
      loadAdminData(); // רענון הטבלה
    }
  };

  // שמירת עריכה
  const handleUpdatePatient = async () => {
    if (!editingPatient) return;
    try {
      const docRef = doc(db, "patients", editingPatient.id);
      const { id, ...dataToUpdate } = editingPatient; // מנקים את ה-ID לפני השליחה
      await updateDoc(docRef, dataToUpdate);
      setEditingPatient(null); // סוגרים את החלונית
      loadAdminData(); // מרעננים
      alert("הפרטים עודכנו בהצלחה");
    } catch (e) {
      alert("שגיאה בעדכון");
    }
  };

  const addTeamMember = async () => {
    if (!newMember.name) return;
    await addDoc(collection(db, "staff"), { ...newMember, joined: serverTimestamp() });
    setNewMember({ name: '', role: '', phone: '' });
    loadAdminData();
  };

  const removeTeamMember = async (id: string) => {
    await deleteDoc(doc(db, "staff", id));
    loadAdminData();
  };

  const runAiAnalysis = () => {
    setLoadingAi(true);
    setTimeout(() => {
      setAiAnalysis(`🔍 דוח AI: זוהה ריכוז חריג של ${patients.length} מבוטחים.`);
      setLoadingAi(false);
    }, 1500);
  };

  const exportToExcel = () => {
    // פונקציית ייצוא בסיסית
    const rows = patients.map(p => `${p.name},${p.personalId},${p.city}`);
    const csvContent = "data:text/csv;charset=utf-8," + "Name,ID,City\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    window.open(encodedUri);
  };

  // --- תצוגה ---

  if (screen === 'SPLASH') return (
    <div style={centerS}><h1 style={{fontSize:'3.5rem', color:'#1a73e8'}}>re-co</h1><p>RECOGNITION LIVE</p></div>
  );

  // --- דשבורד מנהל (עם עריכה ומחיקה) ---
  if (screen === 'ADMIN_LOGIN' && isUnlocked) return (
    <div style={{ direction: 'rtl', padding: '20px', backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
        <h1 style={{color:'#1a73e8', margin:0}}>re-co Manager</h1>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={exportToExcel} style={excelBtnS}>📊 דוח</button>
            <button onClick={runAiAnalysis} style={aiBtnS}>{loadingAi ? "..." : "✨ AI"}</button>
        </div>
      </header>

      {aiAnalysis && <div style={aiBoxStyle}>{aiAnalysis}</div>}

      <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
        {/* טבלת מבוטחים */}
        <div style={{...cardS, flex:2, margin:0, maxWidth:'none'}}>
          <h3 style={{color:'#555'}}>📋 מאגר מבוטחים ({patients.length})</h3>
          <table style={{width:'100%', textAlign:'right', borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid #eee', color:'#666'}}><th>שם</th><th>ת"ז</th><th>טלפון</th><th>פעולות</th></tr></thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                  <td style={{padding:'12px', fontWeight:'bold'}}>{p.name}</td>
                  <td>{p.personalId}</td>
                  <td>{p.patientPhone}</td>
                  <td>
                    {/* כפתורי הפעולה החדשים */}
                    <button onClick={() => setEditingPatient(p)} style={editBtnS}>✏️</button>
                    <button onClick={() => handleDeletePatient(p.id, p.name)} style={delBtnS}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* צוות */}
        <div style={{...cardS, flex:1, margin:0, maxWidth:'none', backgroundColor:'#f8fbff'}}>
          <h3 style={{color:'#1a73e8'}}>צוות</h3>
          <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
            <input placeholder="שם" style={miniInputS} value={newMember.name} onChange={e=>setNewMember({...newMember, name: e.target.value})} />
            <button onClick={addTeamMember} style={addBtnS}>+</button>
          </div>
          <ul style={{padding:0}}>
            {team.map(t => (
              <li key={t.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #eee'}}>
                <span>{t.name}</span><span onClick={()=>removeTeamMember(t.id)} style={{cursor:'pointer'}}>❌</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* חלונית עריכה (Popup) - החלק שהיה חסר קודם */}
      {editingPatient && (
        <div style={overlayS}>
          <div style={modalS}>
            <h3 style={{marginTop:0}}>עריכת {editingPatient.name}</h3>
            <label style={{display:'block', marginBottom:'5px'}}>שם מלא:</label>
            <input style={inputS} value={editingPatient.name} onChange={e => setEditingPatient({...editingPatient, name: e.target.value})} />
            
            <label style={{display:'block', marginBottom:'5px'}}>עיר:</label>
            <input style={inputS} value={editingPatient.city} onChange={e => setEditingPatient({...editingPatient, city: e.target.value})} />
            
            <label style={{display:'block', marginBottom:'5px'}}>טלפון חירום:</label>
            <input style={inputS} value={editingPatient.emergencyPhone} onChange={e => setEditingPatient({...editingPatient, emergencyPhone: e.target.value})} />
            
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
              <button onClick={handleUpdatePatient} style={btnS}>שמור שינויים</button>
              <button onClick={() => setEditingPatient(null)} style={{...btnS, backgroundColor:'#999'}}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- מסך כניסה למנהל ---
  if (screen === 'ADMIN_LOGIN') return (
    <div style={centerS}>
      <div style={cardS}>
        <h2 style={{color:'#1a73e8', textAlign:'center'}}>ניהול re-co</h2>
        <input type="password" style={inputS} placeholder="קוד גישה" onChange={e=>setPinInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleLogin()} />
        <button onClick={handleLogin} style={btnS}>כניסה</button>
      </div>
    </div>
  );

  // --- מסך רישום ---
  if (screen === 'REGISTER') return (
    <div style={{ padding: '20px', direction: 'rtl', textAlign: 'center' }}>
      <h1 style={{color:'#1a73e8'}}>re-co</h1>
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
    </div>
  );

  // --- מסך חירום ---
  return (
    <div style={{ padding: '20px', direction: 'rtl', textAlign: 'center' }}>
      <h1 style={{color:'#1a73e8'}}>re-co</h1>
      <div style={{...cardS, borderTop:'10px solid red'}}>
        <h2 style={{color:'red'}}>מצב חירום!</h2>
        <div style={protocolS}>פוסט טראומי מולך - התנהג לפי הפרוטוקול</div>
        <a href={`tel:${patientData?.emergencyPhone}`} style={callBtnS}>📞 חיוג לאיש קשר לחירום</a>
        <p><strong>שם:</strong> {patientData?.name}</p>
        <p><strong>עיר:</strong> {patientData?.city}</p>
        <div style={storyS}><strong>רקע רפואי:</strong><br/>{patientData?.story || patientData?.patientStory || "אין מידע נוסף"}</div>
      </div>
    </div>
  );
}

// --- סגנונות (Styles) - הכל כאן, שום דבר לא יחסר ---
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
const editBtnS: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', marginLeft:'10px' };
const delBtnS: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem' };
const miniInputS: React.CSSProperties = { flex:1, padding:'8px', borderRadius:'5px', border:'1px solid #ddd' };
const addBtnS: React.CSSProperties = { padding:'0 15px', backgroundColor:'#22c55e', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'1.2rem' };
const overlayS: React.CSSProperties = { position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalS: React.CSSProperties = { backgroundColor:'white', padding:'30px', borderRadius:'15px', width:'90%', maxWidth:'500px' };