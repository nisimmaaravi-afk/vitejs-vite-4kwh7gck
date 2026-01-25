import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { logAction } from '../services/logger';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// הגדרת טיפוסים (Types) למניעת שגיאות
interface Patient {
  id: string;
  fullName: string;
  braceletId: string;
  district: string;
  personalPhone: string;
  medicalHistory: string;
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('currentUser');
  const accessLevel = sessionStorage.getItem('accessLevel');

  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [scanFeed, setScanFeed] = useState<any[]>([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ 
    fullName: '', braceletId: '', district: '', phone: '', history: '' 
  });

  const districtsCoords: { [key: string]: [number, number] } = {
    'north': [32.8, 35.3],
    'center': [32.08, 34.78],
    'south': [31.25, 34.8],
    'jerusalem': [31.76, 35.21],
    'default': [31.4, 35.0]
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, navigate]);

  const fetchData = async () => {
    try {
      const patSnap = await getDocs(collection(db, 'patients'));
      const patList = patSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(patList);

      const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));
      const logSnap = await getDocs(q);
      const logList = logSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logList);

      const scansOnly = logList.filter((l:any) => l.action === 'SCAN' || l.action === 'SCAN_FAIL');
      setScanFeed(scansOnly);

      setStats({
        today: scansOnly.filter((l:any) => safeIsToday(l.timestamp)).length,
        week: scansOnly.length,
        month: patList.length 
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const safeIsToday = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return false;
    const date = timestamp.toDate();
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isLast30Days = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return false;
    const date = timestamp.toDate();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date >= thirtyDaysAgo;
  };

  const getPosition = (district: string): [number, number] => {
    const safeDistrict = String(district || 'default').toLowerCase();
    const base = districtsCoords[safeDistrict] || districtsCoords['default'];
    return [base[0] + (Math.random() * 0.04 - 0.02), base[1] + (Math.random() * 0.04 - 0.02)];
  };

  const getMapMarkers = () => {
    const recentScans = logs.filter((l:any) => l.action === 'SCAN' && isLast30Days(l.timestamp));
    return recentScans.map((scan: any) => {
      const patient = patients.find(p => p.braceletId === scan.details);
      if (!patient) return null;
      return { 
        id: scan.id, 
        fullName: patient.fullName, 
        braceletId: patient.braceletId, 
        district: patient.district, 
        pos: getPosition(patient.district), 
        scanTime: scan.timestamp?.toDate() 
      };
    }).filter(Boolean);
  };

  const handleDelete = async (docId: string) => {
    if (accessLevel !== 'master') return alert('⛔ רק Master Admin מורשה למחוק');
    if (window.confirm('למחוק לצמיתות?')) {
      await deleteDoc(doc(db, 'patients', docId));
      await logAction(currentUser || 'Admin', 'DELETE', `מחיקת מבוטח ID: ${docId}`);
      fetchData();
    }
  };

  const startEdit = (p: Patient) => {
    setEditingPatient(p);
    setEditForm({ 
      fullName: p.fullName || '', 
      braceletId: p.braceletId || '', 
      district: p.district || '', 
      phone: p.personalPhone || '', 
      history: p.medicalHistory || '' 
    });
  };

  const saveEdit = async () => {
    if (!editingPatient) return;
    try {
      await updateDoc(doc(db, 'patients', editingPatient.id), { 
        fullName: editForm.fullName, 
        braceletId: editForm.braceletId, 
        district: editForm.district, 
        personalPhone: editForm.phone, 
        medicalHistory: editForm.history 
      });
      await logAction(currentUser || 'User', 'UPDATE', `עריכה מלאה: ${editForm.fullName}`);
      setEditingPatient(null);
      fetchData();
    } catch (e) {
      alert('שגיאה בשמירה');
    }
  };

  // סגנונות לכפתורים מרובעים
  const btnIconStyle: React.CSSProperties = {
    width: '40px', 
    height: '40px', 
    borderRadius: '8px', 
    border: '1px solid #ddd', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    cursor: 'pointer', 
    fontSize: '18px'
  };

  if (!currentUser) return null;

  return (
    <div style={{ padding: '20px', direction: 'rtl', fontFamily: 'Segoe UI, Arial', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      {/* כותרת */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: 'white', padding: '15px 25px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '50px', objectFit: 'contain' }} onError={(e) => e.currentTarget.style.display = 'none'} />
          <div><p style={{ margin: '0', color: '#6b7280', fontSize: '18px', fontWeight: 'bold' }}>מערכת שליטה ובקרה ארצית</p></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {accessLevel === 'master' && (<button onClick={() => alert('יומן מלא בקרוב')} style={{ background: 'white', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📜 יומן מערכת</button>)}
          <div style={{ textAlign: 'left' }}><span style={{ display: 'block', fontWeight: 'bold', color: '#1f2937', fontSize: '16px' }}>{accessLevel === 'master' ? 'Master Admin' : currentUser}</span></div>
          <button onClick={() => { sessionStorage.clear(); navigate('/login'); }} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>יציאה ➜</button>
        </div>
      </div>

      {/* סטטיסטיקה */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {[{ label: 'סריקות היום', value: stats.today, color: '#10b981' }, { label: 'סריקות השבוע', value: stats.week, color: '#f59e0b' }, { label: 'סה"כ מבוטחים', value: stats.month, color: '#3b82f6' }].map((stat, idx) => (
          <div key={idx} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', color: '#6b7280', marginBottom: '10px' }}>{stat.label}</div>
            <div style={{ fontSize: '42px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '4fr 1fr', gap: '25px', marginBottom: '30px' }}>
        
        {/* טבלת מבוטחים */}
        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '500px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f3f4f6', paddingBottom: '15px', marginBottom: '15px' }}>
             <h3 style={{ margin: 0 }}>👥 מבוטחים ({patients.length})</h3>
             <button onClick={() => navigate('/register')} style={{ background: '#0d6efd', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>➕ הוסף מבוטח</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'right', color: '#6b7280', fontSize: '14px', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '15px', width: '130px' }}>פעולות</th>
                <th style={{ padding: '15px' }}>מחוז</th>
                <th style={{ padding: '15px' }}>שם מלא</th>
                <th style={{ padding: '15px' }}>טלפון</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                    {accessLevel === 'master' && (
                      <button onClick={() => handleDelete(p.id)} style={{ ...btnIconStyle, background: '#ffebee', color: '#c62828', borderColor: '#ffcdd2' }} title="מחק">🗑️</button>
                    )}
                    <button onClick={() => startEdit(p)} style={{ ...btnIconStyle, background: 'white', color: '#555' }} title="ערוך">✏️</button>
                  </td>
                  <td style={{ padding: '10px' }}><span style={{ padding: '5px 12px', borderRadius: '20px', backgroundColor: '#e3f2fd', color: '#1976d2', fontSize: '12px', fontWeight: 'bold' }}>{p.district}</span></td>
                  <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '15px', color: '#333' }}>{p.fullName || '---'}</td>
                  <td style={{ padding: '10px', color: '#666' }}>{p.personalPhone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* פיד סריקות */}
        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '500px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #f3f4f6', paddingBottom: '15px' }}>📡 סריקות</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {scanFeed.length === 0 ? (<p style={{color: '#999', textAlign: 'center'}}>אין סריקות</p>) : scanFeed.map((log) => (
              <div key={log.id} style={{ padding: '15px', borderRadius: '10px', backgroundColor: log.action.includes('FAIL') ? '#fef2f2' : '#f0f9ff', borderRight: log.action.includes('FAIL') ? '4px solid #ef4444' : '4px solid #0ea5e9' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#374151' }}>{log.action === 'SCAN' ? '✅ סריקה' : '⚠️ שגיאה'}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : '---'}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0d6efd', marginTop: '5px' }}>{log.details}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* מפת תקריות */}
      <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>🗺️ מפת תקריות (30 ימים אחרונים)</h3>
        <div style={{ height: '400px', borderRadius: '10px', overflow: 'hidden' }}>
          <MapContainer center={[32.0853, 34.7818]} zoom={8} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {getMapMarkers().map((item: any) => (
              <CircleMarker key={item.id} center={item.pos} pathOptions={{ color: 'red', fillColor: '#f03', fillOpacity: 0.6 }} radius={8}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>{item.fullName}</Tooltip>
                <Popup><strong>{item.fullName}</strong><br/>צמיד: {item.braceletId}<br/>נסרק ב: {item.scanTime?.toLocaleString()}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* מודל עריכה - מעוצב */}
      {editingPatient && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '400px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'right' }}>
            <h3 style={{color: '#2c3e50', textAlign: 'center', marginBottom: '25px', fontSize: '22px'}}>עריכה מלאה:</h3>
            
            <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>שם מלא:</label>
            <input type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '8px'}} />
            
            <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>מספר צמיד:</label>
            <input type="text" value={editForm.braceletId} onChange={e => setEditForm({...editForm, braceletId: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '8px'}} />
            
            <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>מחוז (north/center/south):</label>
            <input type="text" value={editForm.district} onChange={e => setEditForm({...editForm, district: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '8px'}} />
            
            <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>טלפון:</label>
            <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '8px'}} />
            
            <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>מידע רפואי:</label>
            <textarea value={editForm.history} onChange={e => setEditForm({...editForm, history: e.target.value})} rows={4} style={{ width: '100%', padding: '12px', marginBottom: '25px', border: '1px solid #ccc', borderRadius: '8px'}} />
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setEditingPatient(null)} style={{ flex: 1, padding: '12px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>ביטול</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>שמור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;