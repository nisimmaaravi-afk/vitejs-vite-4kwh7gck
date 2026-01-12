// src/pages/AdminPanel.tsx
import React, { useState } from 'react';
import { collection, query, getDocs, orderBy, limit, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from '../services/firebase'; // שים לב לחיבור הנכון לקובץ השירות

export default function AdminPanel() {
  // --- STATE ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState(''); // המשתנה ששומר את הקוד
  const [patients, setPatients] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<any>(null);

  // --- לוגיקת חיפוש ---
  const filteredPatients = patients.filter(p => {
    const s = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(s) || 
      p.personalId?.includes(s) || 
      p.patientPhone?.includes(s)
    );
  });

  // --- פונקציות ---
  const handleLogin = () => {
    if (pinInput === '2430' || pinInput === '015875339') {
      setIsUnlocked(true);
      loadAdminData();
    } else { 
      alert("קוד שגוי"); 
      setPinInput(''); // איפוס השדה במקרה של טעות
    }
  };

  const loadAdminData = async () => {
    try {
      const pSnap = await getDocs(collection(db, "patients"));
      setPatients(pSnap.docs.map(d => ({...d.data(), id: d.id})));
      
      const sSnap = await getDocs(query(collection(db, "scans"), orderBy("time", "desc"), limit(10)));
      setScans(sSnap.docs.map(d => d.data()));
    } catch (e) {
      console.error("Error loading data:", e);
    }
  };

  const handleUpdatePatient = async () => {
    if (!editingPatient) return;
    try {
      const docRef = doc(db, "patients", editingPatient.id);
      const { id, ...dataToUpdate } = editingPatient;
      await updateDoc(docRef, dataToUpdate);
      setEditingPatient(null);
      loadAdminData();
      alert("הפרטים עודכנו בהצלחה");
    } catch (e) {
      console.error("Update error:", e);
      alert("שגיאה בעדכון הנתונים");
    }
  };

  const handleDeletePatient = async (id: string, name: string) => {
    if (window.confirm(`האם למחוק את ${name} לצמיתות?`)) {
      try {
        await deleteDoc(doc(db, "patients", id));
        loadAdminData();
      } catch (e) {
        alert("שגיאה במחיקה");
      }
    }
  };

  // --- תצוגה: מסך נעילה ---
  if (!isUnlocked) return (
    <div style={centerS}>
      <div style={cardS}>
        <h2>כניסת ניהול</h2>
        {/* כאן התיקון לבעיית ההקלדה */}
        <input 
          type="password"
          autoFocus={true}     // פוקוס אוטומטי
          value={pinInput}     // חיבור למשתנה
          style={inputS} 
          placeholder="קוד גישה" 
          onChange={(e) => setPinInput(e.target.value)} // עדכון המשתנה
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()} 
        />
        <button onClick={handleLogin} style={btnS}>כניסה</button>
      </div>
    </div>
  );

  // --- תצוגה: דשבורד מנהל ---
  return (
    <div style={{ direction: 'rtl', padding: '20px', backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <header><h1 style={{color:'#1a73e8', marginBottom: '20px'}}>re-co Manager</h1></header>

      <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
        {/* טבלת מבוטחים */}
        <div style={{...cardS, flex: 2, maxWidth: 'none'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
            <h3>📋 מאגר מבוטחים ({filteredPatients.length})</h3>
            <input 
              style={searchInpS} 
              placeholder="🔍 חיפוש..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <table style={{width:'100%', textAlign:'right', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'2px solid #eee', color:'#666'}}>
                <th>תמונה</th><th>שם</th><th>ת"ז</th><th>פעולות</th>
              </tr>
            </thead>
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

        {/* סריקות אחרונות */}
        <div style={{...cardS, flex: 1, backgroundColor:'#fffcf5'}}>
          <h3>📍 סריקות אחרונות</h3>
          {scans.map((s, i) => (
            <div key={i} style={{padding:'12px', borderBottom:'1px solid #eee', fontSize:'0.85rem'}}>
              <strong>{patients.find(p => p.braceletId === s.bid)?.name || "לא רשום"}</strong><br/>
              <span style={{color:'#666'}}>{s.time?.toDate().toLocaleTimeString()}</span> | 
              {s.lat ? (
                <a 
                  href={`http://googleusercontent.com/maps.google.com/maps?q=${s.lat},${s.lng}`}
                  target="_blank" 
                  rel="noreferrer" 
                  style={{color:'#1a73e8', textDecoration:'none'}}
                > 
                  🌍 מפה
                </a>
              ) : " ❌ ללא GPS"}
            </div>
          ))}
        </div>
      </div>

      {/* חלונית עריכה (Modal) */}
      {editingPatient && (
        <div style={overlayS}>
          <div style={modalS}>
            <h3 style={{borderBottom:'2px solid #1a73e8', paddingBottom:'10px'}}>עריכת מבוטח: {editingPatient.name}</h3>
            
            <div style={{backgroundColor:'#e3f2fd', padding:'10px', borderRadius:'8px', marginBottom:'15px', fontSize:'0.9rem'}}>
               <strong>🔢 מספר צמיד (BID):</strong> {editingPatient.braceletId}
            </div>

            <div style={{maxHeight:'60vh', overflowY:'auto', padding:'5px'}}>
              <label style={labelS}>שם מלא:</label>
              <input style={inputS} value={editingPatient.name} onChange={e=>setEditingPatient({...editingPatient, name: e.target.value})} />
              <label style={labelS}>תעודת זהות:</label>
              <input style={inputS} value={editingPatient.personalId || ""} onChange={e=>setEditingPatient({...editingPatient, personalId: e.target.value})} />
              <label style={labelS}>טלפון אישי:</label>
              <input style={inputS} value={editingPatient.patientPhone || ""} onChange={e=>setEditingPatient({...editingPatient, patientPhone: e.target.value})} />
              <label style={labelS}>טלפון חירום:</label>
              <input style={inputS} value={editingPatient.emergencyPhone || ""} onChange={e=>setEditingPatient({...editingPatient, emergencyPhone: e.target.value})} />
              <label style={labelS}>רקע רפואי:</label>
              <textarea style={{...inputS, height:120}} value={editingPatient.story || ""} onChange={e=>setEditingPatient({...editingPatient, story: e.target.value})} />
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
              <button onClick={handleUpdatePatient} style={btnS}>שמור שינויים</button>
              <button onClick={() => setEditingPatient(null)} style={{...btnS, backgroundColor:'#999'}}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- סגנונות ---
const searchInpS: React.CSSProperties = { padding:'10px 15px', borderRadius:'25px', border:'1px solid #ddd', width:'300px', outline:'none' };
const cardS: React.CSSProperties = { backgroundColor:'#fff', padding:'25px', borderRadius:'20px', boxShadow:'0 10px 25px rgba(0,0,0,0.05)', maxWidth:'500px', margin:'0 auto' };
const inputS: React.CSSProperties = { display:'block', width:'100%', padding:'12px', margin:'10px 0', borderRadius:'10px', border:'1px solid #ccc', boxSizing:'border-box', position:'relative', zIndex:10, backgroundColor:'white' };
const btnS: React.CSSProperties = { width:'100%', padding:'15px', backgroundColor:'#1a73e8', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };
const editBtnS: React.CSSProperties = { background:'#e3f2fd', border:'none', cursor:'pointer', padding:'8px 12px', borderRadius:'8px', color:'#1a73e8', fontWeight:'bold' };
const delBtnS: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', marginRight:'10px' };
const overlayS: React.CSSProperties = { position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalS: React.CSSProperties = { backgroundColor:'white', padding:'25px', borderRadius:'15px', width:'90%', direction:'rtl', maxWidth:'500px' };
const labelS: React.CSSProperties = { display:'block', textAlign:'right', marginTop:'10px', fontWeight:'bold', color:'#555', fontSize:'0.8rem' };
const centerS: React.CSSProperties = { height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor:'#f0f4f8' };