import React, { useState } from 'react';
import { collection, query, getDocs, orderBy, limit, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from '../services/firebase';
import ScansMap from '../components/ScansMap';

export default function AdminPanel() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // משתנים לחלונות קופצים
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [mapScan, setMapScan] = useState<any>(null); 

  const filteredPatients = patients.filter(p => {
    const s = searchTerm.toLowerCase();
    return (p.name?.toLowerCase().includes(s) || p.personalId?.includes(s) || p.patientPhone?.includes(s));
  });

  const handleLogin = () => {
    if (pinInput === '2430' || pinInput === '015875339') {
      setIsUnlocked(true);
      loadAdminData();
    } else { alert("קוד שגוי"); setPinInput(''); }
  };

  const loadAdminData = async () => {
    try {
      const pSnap = await getDocs(collection(db, "patients"));
      setPatients(pSnap.docs.map(d => ({...d.data(), id: d.id})));
      const sSnap = await getDocs(query(collection(db, "scans"), orderBy("time", "desc"), limit(20)));
      setScans(sSnap.docs.map(d => d.data()));
    } catch (e) { console.error("Error loading data:", e); }
  };

  const handleUpdatePatient = async () => {
    if (!editingPatient) return;
    try {
      const docRef = doc(db, "patients", editingPatient.id);
      const { id, ...dataToUpdate } = editingPatient;
      await updateDoc(docRef, dataToUpdate);
      setEditingPatient(null);
      loadAdminData();
      alert("עודכן בהצלחה");
    } catch (e) { alert("שגיאה בעדכון"); }
  };

  const handleDeletePatient = async (id: string, name: string) => {
    if (window.confirm(`למחוק את ${name}?`)) {
      try { await deleteDoc(doc(db, "patients", id)); loadAdminData(); } catch (e) { alert("שגיאה במחיקה"); }
    }
  };

  if (!isUnlocked) return (
    <div style={centerS}>
      <div style={cardS}>
        <h2>כניסת ניהול</h2>
        <input type="password" autoFocus value={pinInput} style={inputS} placeholder="קוד גישה" onChange={(e) => setPinInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
        <button onClick={handleLogin} style={btnS}>כניסה</button>
      </div>
    </div>
  );

  return (
    <div style={{ direction: 'rtl', padding: '20px', backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <header><h1 style={{color:'#1a73e8', marginBottom: '20px'}}>re-co Manager</h1></header>
      
      <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
        {/* טבלת מטופלים - תוקן */}
        <div style={{...cardS, flex: 2, maxWidth: 'none'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
            <h3>📋 מאגר מטופלים ({filteredPatients.length})</h3>
            <input style={searchInpS} placeholder="🔍 חיפוש..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <table style={{width:'100%', textAlign:'right', borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid #eee', color:'#666'}}><th>תמונה</th><th>שם</th><th>ת"ז</th><th>פעולות</th></tr></thead>
            <tbody>
              {filteredPatients.map(p => (
                <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                  <td style={{padding:'8px'}}><img src={p.photoUrl || "https://via.placeholder.com/45"} alt="" style={{width:45, height:45, borderRadius:'50%', objectFit:'cover'}} /></td>
                  <td style={{padding:'12px', fontWeight:'bold'}}>{p.name}</td>
                  <td>{p.personalId}</td>
                  <td>
                    <button onClick={() => setEditingPatient(p)} style={editBtnS}>✏️ עריכה</button>
                    <button onClick={() => handleDeletePatient(p.id, p.name)} style={delBtnS}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* רשימת סריקות אחרונות */}
        <div style={{...cardS, flex: 1, backgroundColor:'#fffcf5', display:'flex', flexDirection:'column'}}>
          <h3>📍 סריקות אחרונות</h3>
          <div style={{overflowY:'auto', maxHeight:'500px'}}>
            {scans.map((s, i) => (
              <div key={i} style={{padding:'15px', borderBottom:'1px solid #eee', fontSize:'0.9rem', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <strong>{patients.find(p => p.braceletId === s.bid)?.name || "לא רשום"}</strong>
                  <div style={{color:'#666', fontSize:'0.8rem', marginTop:'4px'}}>{s.time?.toDate().toLocaleTimeString()}</div>
                </div>
                
                {s.lat && (
                   <button onClick={() => setMapScan(s)} style={mapLinkS}>
                     🌍 מפה
                   </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* חלון קופץ למפה */}
      {mapScan && (
        <div style={overlayS} onClick={() => setMapScan(null)}>
          <div style={{...modalS, width:'90%', height:'80%', maxWidth:'800px'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
              <h3>📍 מיקום סריקה</h3>
              <button onClick={() => setMapScan(null)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}}>✖️</button>
            </div>
            <div style={{height:'90%', borderRadius:'10px', overflow:'hidden'}}>
               <ScansMap scans={[mapScan]} />
            </div>
          </div>
        </div>
      )}

      {/* חלון קופץ לעריכה - תוקן */}
      {editingPatient && (
        <div style={overlayS}>
          <div style={modalS}>
            <h3>עריכת מטופל: {editingPatient.name}</h3>
            <div style={{maxHeight:'60vh', overflowY:'auto', padding:'5px'}}>
              <input style={inputS} value={editingPatient.name} onChange={e=>setEditingPatient({...editingPatient, name: e.target.value})} />
              <input style={inputS} value={editingPatient.personalId || ""} onChange={e=>setEditingPatient({...editingPatient, personalId: e.target.value})} />
              <input style={inputS} value={editingPatient.patientPhone || ""} onChange={e=>setEditingPatient({...editingPatient, patientPhone: e.target.value})} />
              <input style={inputS} value={editingPatient.emergencyPhone || ""} onChange={e=>setEditingPatient({...editingPatient, emergencyPhone: e.target.value})} />
              <textarea style={{...inputS, height:120}} value={editingPatient.story || ""} onChange={e=>setEditingPatient({...editingPatient, story: e.target.value})} />
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
              <button onClick={handleUpdatePatient} style={btnS}>שמור</button>
              <button onClick={() => setEditingPatient(null)} style={{...btnS, backgroundColor:'#999'}}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const searchInpS: React.CSSProperties = { padding:'10px 15px', borderRadius:'25px', border:'1px solid #ddd', width:'300px', outline:'none' };
const cardS: React.CSSProperties = { backgroundColor:'#fff', padding:'25px', borderRadius:'20px', boxShadow:'0 10px 25px rgba(0,0,0,0.05)', maxWidth:'500px', margin:'0 auto' };
const inputS: React.CSSProperties = { display:'block', width:'100%', padding:'12px', margin:'10px 0', borderRadius:'10px', border:'1px solid #ccc', boxSizing:'border-box', backgroundColor:'white' };
const btnS: React.CSSProperties = { width:'100%', padding:'15px', backgroundColor:'#1a73e8', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };
const editBtnS: React.CSSProperties = { background:'#e3f2fd', border:'none', cursor:'pointer', padding:'8px 12px', borderRadius:'8px', color:'#1a73e8', fontWeight:'bold' };
const delBtnS: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', marginRight:'10px' };
const mapLinkS: React.CSSProperties = { background:'#e8f0fe', border:'none', padding:'8px 15px', borderRadius:'20px', color:'#1a73e8', fontWeight:'bold', cursor:'pointer' };
const overlayS: React.CSSProperties = { position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalS: React.CSSProperties = { backgroundColor:'white', padding:'25px', borderRadius:'15px', width:'90%', direction:'rtl', maxWidth:'500px' };
const centerS: React.CSSProperties = { height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor:'#f0f4f8' };