import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy, limit, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = sessionStorage.getItem('isAdmin');
  const accessLevel = sessionStorage.getItem('userRole');
  const currentUser = accessLevel === 'master' ? 'Master Admin' : 'Admin';

  const [patients, setPatients] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [authorities, setAuthorities] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAdmin) navigate('/');
    else fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    const patSnap = await getDocs(collection(db, 'users'));
    setPatients(patSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const authSnap = await getDocs(collection(db, 'organizations'));
    setAuthorities(authSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));
    const logSnap = await getDocs(q);
    setLogs(logSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleAddAuthority = async () => {
    if (accessLevel !== 'master') return alert('⛔ גישה למאסטר בלבד');
    const name = prompt("שם הגוף (למשל: משטרת ישראל):");
    const code = prompt("קוד גישה ייעודי:");
    if (name && code) {
      await addDoc(collection(db, 'organizations'), { name, code });
      fetchData();
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <style>{`
        .admin-wrapper { padding: 20px; direction: rtl; font-family: Segoe UI, Arial; background-color: #f3f4f6; min-height: 100vh; }
        .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background-color: white; padding: 15px 25px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .patients-panel { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .org-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
      `}</style>

      <div className="admin-wrapper">
        <div className="admin-header">
          <div style={{ fontSize: '26px', fontWeight: '900' }}>Recognition <span style={{color: '#2563eb'}}>Live</span></div>
          <div><strong>{currentUser}</strong> | <button onClick={() => {sessionStorage.clear(); navigate('/');}} style={{border:'none', background:'none', color:'red', cursor:'pointer'}}>יציאה</button></div>
        </div>

        {/* קוביית רשויות */}
        <div className="patients-panel">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
            <h3 style={{margin:0}}>🏢 ניהול רשויות (קודים לשטח)</h3>
            {accessLevel === 'master' && <button onClick={handleAddAuthority} style={{background:'#10b981', color:'white', border:'none', padding:'8px 15px', borderRadius:'8px', cursor:'pointer'}}>+ הוסף גוף</button>}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px'}}>
            {authorities.map(a => (
              <div key={a.id} className="org-card">
                <span><strong>{a.name}</strong><br/><small>קוד: {a.code}</small></span>
                {accessLevel === 'master' && <button onClick={async () => {await deleteDoc(doc(db, 'organizations', a.id)); fetchData();}} style={{border:'none', background:'none', color:'red'}}>🗑️</button>}
              </div>
            ))}
          </div>
        </div>

        {/* טבלת מבוטחים - העיצוב המקורי שלך */}
        <div className="patients-panel">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
            <h3 style={{margin:0}}>👥 מבוטחים במערכת</h3>
            <input type="text" placeholder="חיפוש..." onChange={e => setSearchTerm(e.target.value)} style={{padding:'8px', borderRadius:'8px', border:'1px solid #ddd'}} />
          </div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{textAlign:'right', borderBottom:'2px solid #eee'}}>
                <th style={{padding:'10px'}}>מחוז</th>
                <th style={{padding:'10px'}}>שם מלא</th>
                <th style={{padding:'10px'}}>צמיד</th>
              </tr>
            </thead>
            <tbody>
              {patients.filter(p => p.fullName?.includes(searchTerm)).map(p => (
                <tr key={p.id} style={{borderBottom:'1px solid #f9f9f9'}}>
                  <td style={{padding:'10px'}}>{p.district}</td>
                  <td style={{padding:'10px'}}><strong>{p.fullName}</strong></td>
                  <td style={{padding:'10px'}}>{p.tagId || p.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* מפה */}
        <div className="patients-panel">
          <h3>🗺️ מפת אירועים בזמן אמת</h3>
          <div style={{height:'400px', borderRadius:'15px', overflow:'hidden', marginTop:'15px'}}>
            <MapContainer center={[32.08, 34.78]} zoom={8} style={{height:'100%'}}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </MapContainer>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;