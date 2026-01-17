import React, { useState } from 'react';
import { collection, getDocs, orderBy, query, limit, updateDoc, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../services/firebase';

// --- מפות ---
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- תיקון אייקונים ---
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const redDotIcon = new L.DivIcon({
  className: 'custom-icon',
  html: '<div style="background-color: #d32f2f; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// הגדרות
interface Patient {
  id: string;
  name?: string;
  district?: string;
  braceletId?: string;
  personalId?: string;
  emergencyPhone?: string;
  photoUrl?: string;
  story?: string;
  [key: string]: any;
}

type UserRole = 'HQ' | 'DISTRICT_MANAGER' | 'CASE_MANAGER';

interface UserProfile {
  name: string;
  role: UserRole;
  district: string;
}

export default function AdminPanel() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState('');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allScans, setAllScans] = useState<any[]>([]);
  const [mapScans, setMapScans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const logSystemAccess = async (user: UserProfile) => {
    try {
      await addDoc(collection(db, "system_logs"), {
        userName: user.name,
        userRole: user.role,
        district: user.district,
        action: "LOGIN",
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error("Error logging access:", e); }
  };

  const fetchLogs = async () => {
    try {
      const q = query(collection(db, "system_logs"), orderBy("timestamp", "desc"), limit(50));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => d.data());
      setLogs(data);
      setShowLogsModal(true);
    } catch (e) { alert("שגיאה בטעינת לוגים"); }
  };

  const handleLogin = async () => {
    let userToLogin: UserProfile | null = null;
    if (pinInput === '015875339') userToLogin = { name: 'מנהל מטה ראשי', role: 'HQ', district: 'ALL' };
    else if (pinInput === '2430') userToLogin = { name: 'יוסי - מחוז צפון', role: 'DISTRICT_MANAGER', district: 'צפון' };
    else if (pinInput === '2431') userToLogin = { name: 'רונית - מחוז דרום', role: 'DISTRICT_MANAGER', district: 'דרום' };
    else if (pinInput === '2432') userToLogin = { name: 'דוד - מחוז מרכז', role: 'DISTRICT_MANAGER', district: 'מרכז' };
    else { alert("קוד שגוי 🔒"); return; }

    if (userToLogin) {
      setCurrentUser(userToLogin);
      await logSystemAccess(userToLogin);
      loadData(userToLogin.district);
    }
  };

  const loadData = async (userDistrict: string) => {
    try {
      const pSnap = await getDocs(collection(db, "patients"));
      let loadedPatients = pSnap.docs.map(d => ({...d.data(), id: d.id} as Patient));
      if (userDistrict !== 'ALL') {
          loadedPatients = loadedPatients.filter(p => p.district === userDistrict);
      }
      setPatients(loadedPatients);
      
      const sSnap = await getDocs(query(collection(db, "scans"), orderBy("time", "desc"), limit(300)));
      const loadedScans = sSnap.docs.map(d => d.data());
      setAllScans(loadedScans);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const validMapScans = loadedScans.filter(s => {
         if (!s.time) return false;
         const sTime = s.time.toDate();
         const relevantPatient = loadedPatients.find(p => p.braceletId === s.bid);
         return s.lat && s.lng && sTime > thirtyDaysAgo && (userDistrict === 'ALL' || relevantPatient);
      });
      setMapScans(validMapScans);
      calculateStats(loadedScans);
    } catch (e) { console.error("Error:", e); }
  };

  const calculateStats = (data: any[]) => {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    let today = 0, week = 0, month = 0;
    data.forEach(scan => {
        if (!scan.time) return;
        const diffDays = Math.ceil(Math.abs(now.getTime() - scan.time.toDate().getTime()) / oneDay);
        if (diffDays <= 1) today++;
        if (diffDays <= 7) week++;
        if (diffDays <= 30) month++;
    });
    setStats({ today, week, month });
  };

  const handleUpdate = async () => {
    if (!editingPatient) return;
    try {
      const docRef = doc(db, "patients", editingPatient.id);
      const { id, ...data } = editingPatient;
      await updateDoc(docRef, data);
      setEditingPatient(null); 
      if (currentUser) loadData(currentUser.district);
      alert("עודכן בהצלחה ✅");
    } catch (e) { alert("שגיאה בעדכון"); }
  };

  const handleDelete = async (id: string, name: string | undefined) => {
    if (window.confirm(`למחוק את ${name}?`)) {
      try { 
          await deleteDoc(doc(db, "patients", id)); 
          if (currentUser) loadData(currentUser.district); 
          if(selectedPatient?.id===id) setSelectedPatient(null); 
      } 
      catch (e) { alert("שגיאה"); }
    }
  };

  const filteredPatients = patients.filter(p => p.name?.includes(searchTerm) || p.personalId?.includes(searchTerm));
  const displayedPatients = searchTerm ? filteredPatients : filteredPatients.slice(0, 10);
  const leftPanelScans = selectedPatient ? allScans.filter(s => s.bid === selectedPatient.braceletId) : allScans.slice(0, 20);

  if (!currentUser) return (
    <div style={centerS}>
      <div style={loginCardS}>
        <h2 style={{color:'#1a73e8', marginBottom:'20px'}}>re-co Secure Login</h2>
        <input type="password" style={inputS} placeholder="קוד זיהוי" value={pinInput} onChange={e=>setPinInput(e.target.value)} />
        <button onClick={handleLogin} style={btnS}>כניסה מאובטחת</button>
      </div>
    </div>
  );

  return (
    <div style={dashboardS}>
      <div style={headerWrapperS}>
        <div style={containerS}>
           <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                  <h1 style={{margin:0, fontSize:'1.6rem', color:'#333'}}>מערכת שליטה ובקרה</h1>
                  <div style={{fontSize:'0.9rem', color:'#666'}}>
                      משתמש: <strong>{currentUser.name}</strong> | {currentUser.role === 'HQ' ? 'מטה ראשי' : `מנהל מחוז ${currentUser.district}`}
                  </div>
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                  {currentUser.role === 'HQ' && (
                    <button onClick={fetchLogs} style={{...btnS, width:'auto', background:'#fb8c00', marginTop:0, padding:'8px 15px', fontSize:'0.9rem'}}>📋 יומן פעילות</button>
                  )}
                  <button onClick={() => window.location.reload()} style={{...btnS, width:'auto', background:'#455a64', marginTop:0, padding:'8px 20px', fontSize:'0.9rem'}}>יציאה</button>
              </div>
           </div>
        </div>
      </div>

      <div style={containerS}>
        <div style={statsGridS}>
          <div style={statCardS}><div style={statNumS}>{stats.today}</div><div>היום</div></div>
          <div style={statCardS}><div style={statNumS}>{stats.week}</div><div>השבוע</div></div>
          <div style={statCardS}><div style={statNumS}>{stats.month}</div><div>החודש</div></div>
        </div>

        <div style={mainGridS}>
          <div style={cardS}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', alignItems:'center'}}>
              <h3 style={{margin:0}}>👥 מבוטחים ({patients.length})</h3>
              <input style={searchS} placeholder="🔍 חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div style={tableWrapperS}>
              <table style={tableS}>
                <thead><tr style={{background:'#f8f9fa', color:'#666'}}><th>תמונה</th><th>שם</th><th>מחוז</th><th>פעולות</th></tr></thead>
                <tbody>
                  {displayedPatients.map(p => (
                    <tr key={p.id} style={{borderBottom:'1px solid #eee', transition:'background 0.2s', background: selectedPatient?.id === p.id ? '#e3f2fd' : 'transparent'}}>
                      <td><img src={p.photoUrl || "https://via.placeholder.com/40"} style={{width:40, height:40, borderRadius:'50%', objectFit:'cover'}} alt=""/></td>
                      <td style={{fontWeight:'600'}}>{p.name}</td>
                      <td style={{color:'#666', fontSize:'0.85rem'}}>{p.district || "---"}</td>
                      <td>
                        <button onClick={() => setSelectedPatient(p)} style={{...actionBtnS, background: selectedPatient?.id === p.id ? '#1565c0' : '#e3f2fd', color: selectedPatient?.id === p.id ? 'white' : '#1565c0'}}>📜 היסטוריה</button>
                        <button onClick={() => setEditingPatient(p)} style={actionBtnS}>✏️</button>
                        {currentUser.role === 'HQ' && <button onClick={() => handleDelete(p.id, p.name)} style={{...actionBtnS, color:'#d32f2f', background:'#ffebee'}}>🗑️</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {patients.length === 0 && <div style={{textAlign:'center', padding:'20px', color:'#999'}}>אין מבוטחים המשויכים למחוז זה</div>}
            </div>
          </div>

          <div style={cardS}>
            <div style={{borderBottom:'1px solid #eee', paddingBottom:'15px', marginBottom:'15px'}}>
               {selectedPatient ? (
                 <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <img src={selectedPatient.photoUrl} style={{width:50, height:50, borderRadius:'50%', objectFit:'cover', border:'2px solid #1a73e8'}} alt="" />
                    <div>
                        <h3 style={{margin:0, fontSize:'1.1rem'}}>{selectedPatient.name}</h3>
                        <button onClick={() => setSelectedPatient(null)} style={{border:'none', background:'none', color:'#1a73e8', cursor:'pointer', padding:0, fontSize:'0.85rem', fontWeight:'bold'}}>חזור לפיד הכללי ↺</button>
                    </div>
                 </div>
               ) : (
                 <h3 style={{margin:0, color:'#333'}}>📡 פיד סריקות (Live)</h3>
               )}
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:'12px', maxHeight:'500px', overflowY:'auto', paddingLeft:'5px'}}>
                {leftPanelScans.map((s, i) => {
                   const pName = patients.find(p => p.braceletId === s.bid)?.name || "לא רשום במחוז";
                   return (
                    <div key={i} style={scanItemS}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                        <strong>{selectedPatient ? `#${leftPanelScans.length - i}` : pName}</strong>
                        <span style={{fontSize:'0.75rem', color:'#888'}}>{s.time?.toDate().toLocaleString('he-IL')}</span>
                      </div>
                      {s.lat ? (
                         <a href={`http://googleusercontent.com/maps.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" style={mapLinkS}>📍 צפה במפה</a>
                      ) : <span style={{fontSize:'0.8rem', color:'#999'}}>ללא מיקום</span>}
                    </div>
                   );
                })}
            </div>
          </div>
        </div>

        <div style={{marginTop:'40px', marginBottom:'60px'}}>
           <div style={{textAlign:'center', marginBottom:'20px'}}>
             <h2 style={{color:'#333', margin:0}}>🗺️ מפת שליטה ארצית</h2>
             <span style={{color:'#666', fontSize:'0.9rem'}}>מציג סריקות מ-30 הימים האחרונים ({currentUser.district === 'ALL' ? 'כל הארץ' : currentUser.district})</span>
           </div>
           
           <div style={{height:'550px', width:'100%', borderRadius:'24px', overflow:'hidden', boxShadow:'0 15px 40px rgba(0,0,0,0.1)', border:'4px solid white', position:'relative', zIndex: 0}}>
             <MapContainer center={[31.4, 35.0]} zoom={8} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mapScans.map((s, i) => {
                   const p = patients.find(pat => pat.braceletId === s.bid);
                   return (
                     <Marker key={i} position={[s.lat, s.lng]} icon={redDotIcon}>
                       <Popup>
                         <div style={{textAlign:'right', direction:'rtl', minWidth:'150px'}}>
                           <h3 style={{margin:'0 0 5px 0'}}>{p?.name || "לא ידוע"}</h3>
                           <div style={{fontSize:'0.85rem', color:'#666', marginBottom:'10px'}}>{s.time?.toDate().toLocaleString()}</div>
                           <a href={`tel:${p?.emergencyPhone}`} style={{display:'block', background:'#d32f2f', color:'white', textAlign:'center', padding:'8px', borderRadius:'6px', textDecoration:'none', fontWeight:'bold'}}>📞 חיוג חירום</a>
                         </div>
                       </Popup>
                     </Marker>
                   )
                })}
             </MapContainer>
           </div>
        </div>
      </div>

      {editingPatient && (
        <div style={overlayS}>
           <div style={modalS}>
             <h3 style={{marginTop:0}}>עריכת פרטים: {editingPatient.name}</h3>
             <label style={labelS}>שם מלא</label>
             <input style={inputS} value={editingPatient.name} onChange={e=>setEditingPatient({...editingPatient, name: e.target.value})} />
             <label style={labelS}>מחוז (צפון/דרום/מרכז)</label>
             <input style={inputS} value={editingPatient.district || ''} onChange={e=>setEditingPatient({...editingPatient, district: e.target.value})} placeholder="לדוגמה: מרכז" />
             <label style={labelS}>טלפון חירום</label>
             <input style={inputS} value={editingPatient.emergencyPhone} onChange={e=>setEditingPatient({...editingPatient, emergencyPhone: e.target.value})} />
             <label style={labelS}>מידע רפואי</label>
             <textarea style={{...inputS, height:'100px', fontFamily:'inherit'}} value={editingPatient.story} onChange={e=>setEditingPatient({...editingPatient, story: e.target.value})} />
             <div style={{marginTop:'20px', display:'flex', gap:'10px'}}>
                <button onClick={handleUpdate} style={btnS}>שמור שינויים</button>
                <button onClick={() => setEditingPatient(null)} style={{...btnS, background:'#cfd8dc', color:'#455a64'}}>ביטול</button>
             </div>
           </div>
        </div>
      )}

      {showLogsModal && (
        <div style={overlayS}>
           <div style={{...modalS, maxWidth:'600px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                  <h3 style={{margin:0}}>📋 יומן כניסות למערכת</h3>
                  <button onClick={() => setShowLogsModal(false)} style={{border:'none', background:'none', fontSize:'1.2rem', cursor:'pointer'}}>✖️</button>
              </div>
              <div style={{maxHeight:'400px', overflowY:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9rem'}}>
                    <thead>
                        <tr style={{background:'#eee', textAlign:'right'}}>
                            <th style={{padding:'8px'}}>משתמש</th>
                            <th style={{padding:'8px'}}>תפקיד</th>
                            <th style={{padding:'8px'}}>זמן</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, i) => (
                            <tr key={i} style={{borderBottom:'1px solid #ddd'}}>
                                <td style={{padding:'8px'}}>{log.userName}</td>
                                <td style={{padding:'8px'}}>{log.userRole}</td>
                                <td style={{padding:'8px', direction:'ltr', textAlign:'right'}}>
                                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'עכשיו...'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs.length === 0 && <div style={{textAlign:'center', padding:'20px'}}>טוען או שאין נתונים...</div>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- סגנונות ---
const centerS: React.CSSProperties = { minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#f0f4f8', direction:'rtl', fontFamily:'system-ui, -apple-system, sans-serif' };
const loginCardS: React.CSSProperties = { background:'white', padding:'40px', borderRadius:'24px', boxShadow:'0 20px 40px rgba(0,0,0,0.08)', textAlign:'center', width:'100%', maxWidth:'360px' };
const dashboardS: React.CSSProperties = { minHeight:'100vh', background:'#f8f9fa', direction:'rtl', fontFamily:'system-ui, -apple-system, sans-serif', paddingBottom:'40px', overflowX:'hidden' };
const headerWrapperS: React.CSSProperties = { background:'white', boxShadow:'0 2px 15px rgba(0,0,0,0.04)', marginBottom:'30px', padding:'15px 0' };
const containerS: React.CSSProperties = { width:'100%', maxWidth:'1280px', margin:'0 auto', padding:'0 25px', boxSizing:'border-box' };
const statsGridS: React.CSSProperties = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px', marginBottom:'30px' };
const statCardS: React.CSSProperties = { background:'white', padding:'25px', borderRadius:'16px', boxShadow:'0 4px 15px rgba(0,0,0,0.03)', textAlign:'center', borderTop:'5px solid #1a73e8' };
const statNumS: React.CSSProperties = { fontSize:'2.2rem', fontWeight:'800', color:'#333', marginBottom:'5px' };
const mainGridS: React.CSSProperties = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' };
const cardS: React.CSSProperties = { background:'white', padding:'25px', borderRadius:'20px', boxShadow:'0 5px 20px rgba(0,0,0,0.03)', minHeight:'500px' };
const tableWrapperS: React.CSSProperties = { overflowX:'auto' };
const tableS: React.CSSProperties = { width:'100%', borderCollapse:'collapse', fontSize:'0.9rem' };
const inputS: React.CSSProperties = { width:'100%', padding:'14px', margin:'8px 0', borderRadius:'10px', border:'1px solid #e0e0e0', boxSizing:'border-box', fontSize:'1rem', outline:'none', background:'#f9f9f9' };
const btnS: React.CSSProperties = { width:'100%', padding:'14px', background:'#1a73e8', color:'white', border:'none', borderRadius:'10px', fontSize:'1rem', fontWeight:'bold', cursor:'pointer', marginTop:'10px' };
const searchS: React.CSSProperties = { padding:'10px 18px', borderRadius:'30px', border:'1px solid #ddd', width:'220px', outline:'none', fontSize:'0.9rem' };
const actionBtnS: React.CSSProperties = { border:'none', cursor:'pointer', padding:'6px 12px', borderRadius:'8px', marginLeft:'6px', fontSize:'0.85rem', fontWeight:'bold', transition:'all 0.2s' };
const scanItemS: React.CSSProperties = { padding:'15px', borderBottom:'1px solid #f0f0f0', background:'#fff', borderRadius:'12px', border: '1px solid #f0f0f0', marginBottom:'10px' };
const mapLinkS: React.CSSProperties = { display:'inline-block', marginTop:'5px', color:'#1a73e8', background:'#e3f2fd', padding:'5px 12px', borderRadius:'20px', textDecoration:'none', fontSize:'0.8rem', fontWeight:'bold' };
const overlayS: React.CSSProperties = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999 };
const modalS: React.CSSProperties = { background:'white', padding:'40px', borderRadius:'24px', width:'100%', maxWidth:'450px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' };
const labelS: React.CSSProperties = { display:'block', marginTop:'15px', marginBottom:'5px', fontWeight:'bold', fontSize:'0.9rem', color:'#555' };