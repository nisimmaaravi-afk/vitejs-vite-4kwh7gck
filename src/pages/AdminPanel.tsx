import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const logAction = async (user: string, action: string, details: string) => {
  console.log(`[LOG] ${user}: ${action} - ${details}`);
};

interface Patient {
  id: string;
  fullName: string;
  braceletId: string;
  district: string;
  personalPhone: string;
  medicalHistory: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  notes?: string;
  patientPhone?: string;
  phone?: string;
  tagId?: string;
  idNumber?: string;
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = sessionStorage.getItem('isAdmin');
  const accessLevel = sessionStorage.getItem('userRole');
  const currentUser = isAdmin ? (accessLevel === 'master' ? 'Master Admin' : 'Admin') : null;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [scanFeed, setScanFeed] = useState<any[]>([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ 
    fullName: '', braceletId: '', district: '', phone: '', history: '' 
  });

  const districtsCoords: { [key: string]: [number, number] } = {
    'north': [32.8, 35.3],
    'center': [32.08, 34.78],
    'south': [31.25, 34.8],
    'default': [31.4, 35.0]
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    } else {
      fetchData();
      const interval = setInterval(fetchData, 10000); 
      return () => clearInterval(interval);
    }
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    try {
      const patSnap = await getDocs(collection(db, 'users')); 
      const patList = patSnap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`,
          braceletId: data.tagId || doc.id,
          medicalHistory: data.notes || data.medicalHistory || '',
          personalPhone: data.patientPhone || data.phone || '',
          district: data.district || data.city || 'כללי'
        } as Patient;
      });
      setPatients(patList);

      try {
        const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(500));
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
      } catch (e) {
          console.log("No logs collection found yet");
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const formatDurationFriendly = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    if (totalMinutes < 1) return "פחות מדקה";
    if (totalMinutes < 60) return `${totalMinutes} דקות`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) return `${hours} שעות עגולות`;
    return `${hours} שעות ו-${minutes} דקות`;
  };

  const exportToCSV = () => {
    let csvContent = "תאריך,שעת סריקה ראשונית,שעת סגירת אירוע,משך אירוע,מספר צמיד,מספר סריקות,תוצאת האירוע,הערות צוות\n";
    const clean = (text: any) => (text || '').toString().replace(/,/g, ' ').replace(/\n/g, ' ').trim();
    const MS_IN_24H = 24 * 60 * 60 * 1000;
    const chronologicalLogs = [...logs].sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return tA - tB;
    });
    const activeSessions: { [key: string]: any } = {}; 
    const completedSessions: any[] = []; 
    chronologicalLogs.forEach(log => {
        const bid = log.details;
        const time = log.timestamp?.toDate ? log.timestamp.toDate() : null;
        if (!time) return;
        if (log.action === 'SCAN') {
            if (!activeSessions[bid]) {
                activeSessions[bid] = { startDate: time, bid: bid, outcome: 'טרם נסגר', notes: '', endDate: null, scanCount: 1 };
            } else {
                const elapsed = time.getTime() - activeSessions[bid].startDate.getTime();
                if (elapsed > MS_IN_24H) {
                    const oldSession = activeSessions[bid];
                    oldSession.outcome = '🔴 לא נסגר (עברו 24 שעות)';
                    oldSession.endDate = null;
                    oldSession.forceStopClock = true;
                    completedSessions.push(oldSession);
                    activeSessions[bid] = { startDate: time, bid: bid, outcome: 'טרם נסגר', notes: '', endDate: null, scanCount: 1 };
                } else {
                    activeSessions[bid].scanCount += 1;
                }
            }
        } else if (log.action === 'EVENT_RESOLVED') {
            if (activeSessions[bid]) {
                const session = activeSessions[bid];
                session.endDate = time;
                session.outcome = log.outcome;
                session.notes = log.notes;
                completedSessions.push(session);
                delete activeSessions[bid];
            } else {
                completedSessions.push({ startDate: time, endDate: time, bid: bid, outcome: log.outcome, notes: log.notes, scanCount: 0 });
            }
        }
    });
    Object.values(activeSessions).forEach(session => {
        const now = new Date();
        const elapsed = now.getTime() - session.startDate.getTime();
        if (elapsed > MS_IN_24H) { session.outcome = '🔴 לא נסגר (עברו 24 שעות)'; session.forceStopClock = true; }
        else { session.outcome = '🔴 אירוע פעיל / לא נסגר'; session.forceStopClock = false; }
        session.endDate = null;
        completedSessions.push(session);
    });
    completedSessions.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    completedSessions.forEach(session => {
        const dateStr = session.startDate.toLocaleDateString('he-IL');
        const startTimeStr = session.startDate.toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
        let endTimeStr = '';
        let durationStr = '';
        if (session.endDate) {
            endTimeStr = session.endDate.toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
            durationStr = formatDurationFriendly(session.startDate, session.endDate);
        } else {
            if (session.forceStopClock) { durationStr = 'חריגה'; }
            else { const timeRunning = formatDurationFriendly(session.startDate, new Date()); durationStr = `רץ כבר ${timeRunning}`; }
        }
        let outcomeHeb = clean(session.outcome);
        if (outcomeHeb.includes('calmed')) outcomeHeb = 'הרגעה בשטח';
        if (outcomeHeb.includes('police')) outcomeHeb = 'טיפול משטרתי';
        if (outcomeHeb.includes('ambulance')) outcomeHeb = 'פינוי רפואי';
        if (outcomeHeb.includes('family')) outcomeHeb = 'הגעת בן משפחה';
        if (outcomeHeb.includes('refused')) outcomeHeb = 'סירוב לקבלת עזרה';
        const notes = clean(session.notes);
        const count = session.scanCount || 1;
        csvContent += `${dateStr},${startTimeStr},${endTimeStr},${durationStr},${session.bid},${count},${outcomeHeb},${notes}\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `recognition_live_report_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
        (p.fullName && p.fullName.toLowerCase().includes(term)) ||
        (p.braceletId && p.braceletId.includes(term)) ||
        (p.idNumber && p.idNumber.includes(term)) ||
        (p.personalPhone && p.personalPhone.includes(term))
    );
  });

  const handleAddPatient = () => {
    const id = prompt("הכנס מספר צמיד חדש (למשל: 1002):");
    if (id && id.trim().length > 0) window.location.href = `/?bid=${id}`;
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

  const getFallbackPosition = (district: string): [number, number] => {
    const safeDistrict = String(district || 'default').toLowerCase();
    if (districtsCoords[safeDistrict]) {
        const base = districtsCoords[safeDistrict];
        return [base[0] + (Math.random() * 0.04 - 0.02), base[1] + (Math.random() * 0.04 - 0.02)];
    }
    return [31.4 + (Math.random() * 0.1), 35.0 + (Math.random() * 0.1)];
  };

  const getEventStatus = (scanLog: any, allLogs: any[]) => {
      const scanTime = scanLog.timestamp?.toDate ? scanLog.timestamp.toDate() : new Date();
      const now = new Date();
      const diffMinutes = (now.getTime() - scanTime.getTime()) / 60000;
      const resolveLog = allLogs.find(l => l.action === 'EVENT_RESOLVED' && l.details === scanLog.details && l.timestamp?.toDate() > scanTime);
      if (resolveLog) return { color: '#10b981', label: 'סגור' };
      if (diffMinutes > 60) return { color: '#9ca3af', label: 'לבירור' };
      return { color: '#ef4444', label: 'פתוח' };
  };

  const getMapMarkers = () => {
    const recentScans = logs.filter((l:any) => l.action === 'SCAN' && isLast30Days(l.timestamp));
    const uniqueScans = new Map();
    recentScans.forEach((scan: any) => {
        if (!uniqueScans.has(scan.details)) uniqueScans.set(scan.details, scan);
    });
    return Array.from(uniqueScans.values()).map((scan: any) => {
      const patient = patients.find(p => p.braceletId === scan.details);
      if (!patient) return null;
      let position: [number, number];
      let isGps = false;
      if (scan.location && scan.location.lat && scan.location.lng) {
        position = [scan.location.lat, scan.location.lng];
        isGps = true;
      } else {
        position = getFallbackPosition(patient.district);
      }
      const eventStatus = getEventStatus(scan, logs);
      return { id: scan.id, fullName: patient.fullName, braceletId: patient.braceletId, district: patient.district, pos: position, isGps: isGps, scanTime: scan.timestamp?.toDate(), statusColor: eventStatus.color, statusLabel: eventStatus.label };
    }).filter(Boolean);
  };

  const handleDelete = async (docId: string) => {
    if (accessLevel !== 'master') return alert('⛔ רק Master Admin מורשה למחוק');
    if (window.confirm('למחוק לצמיתות?')) {
      await deleteDoc(doc(db, 'users', docId));
      await logAction(currentUser || 'Admin', 'DELETE', `מחיקת מבוטח ID: ${docId}`);
      fetchData();
    }
  };

  const startEdit = (p: Patient) => {
    setEditingPatient(p);
    setEditForm({ fullName: p.fullName || '', braceletId: p.braceletId || '', district: p.district || '', phone: p.personalPhone || '', history: p.medicalHistory || '' });
  };

  const saveEdit = async () => {
    if (!editingPatient) return;
    try {
      await updateDoc(doc(db, 'users', editingPatient.id), { fullName: editForm.fullName, tagId: editForm.braceletId, district: editForm.district, patientPhone: editForm.phone, notes: editForm.history });
      await logAction(currentUser || 'User', 'UPDATE', `עריכה מלאה: ${editForm.fullName}`);
      setEditingPatient(null);
      fetchData();
    } catch (e) {
      alert('שגיאה בשמירה');
    }
  };

  const btnIconStyle: React.CSSProperties = {
    width: '40px', height: '40px', borderRadius: '8px', border: '1px solid #ddd', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px'
  };

  if (!isAdmin) return null;

  return (
    <>
      <style>{`
        .admin-wrapper { padding: 20px; direction: rtl; font-family: Segoe UI, Arial; background-color: #f3f4f6; min-height: 100vh; }
        
        /* Header */
        .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background-color: white; padding: 15px 25px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 12px; }
        .admin-header-left { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .admin-header-right { display: flex; align-items: center; gap: 20px; }

        /* Stats grid */
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }

        /* Main content grid: table + feed */
        .main-grid { display: grid; grid-template-columns: 4fr 1fr; gap: 25px; margin-bottom: 30px; }

        /* Patients table header row */
        .table-header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 15px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
        .table-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        /* Responsive: tablet */
        @media (max-width: 900px) {
          .main-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
        }

        /* Responsive: mobile */
        @media (max-width: 600px) {
          .admin-wrapper { padding: 12px; }
          .admin-header { padding: 12px 16px; }
          .admin-header-left { gap: 10px; }
          .stats-grid { grid-template-columns: 1fr; gap: 10px; }
          .main-grid { grid-template-columns: 1fr; gap: 16px; }
          .table-header-row { flex-direction: column; align-items: flex-start; }
          .table-actions { width: 100%; }
          .table-actions button { flex: 1; font-size: 12px; padding: 8px 10px; }
          .search-input { width: 100% !important; }
          .patients-table th, .patients-table td { padding: 8px 6px; font-size: 13px; }
          .patients-table th:nth-child(3), .patients-table td:nth-child(3) { display: none; } /* hide district on mobile */
          .map-container { height: 300px !important; }
          .scan-feed { height: auto !important; max-height: 350px; }
          .patients-panel { height: auto !important; max-height: 450px; }
          .divider { display: none; }
        }
      `}</style>

      <div className="admin-wrapper">
        
        {/* כותרת */}
        <div className="admin-header">
          <div className="admin-header-left">
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '1px', lineHeight: '1' }}>
              Recognition <span style={{color: '#2563eb'}}>Live</span>
            </div>
            <div className="divider" style={{ height: '35px', width: '2px', backgroundColor: '#e2e8f0' }}></div>
            <div><p style={{ margin: '0', color: '#64748b', fontSize: '18px', fontWeight: 'bold' }}>מערכת שליטה ובקרה ארצית</p></div>
          </div>
          <div className="admin-header-right">
            <div style={{ textAlign: 'left' }}><span style={{ display: 'block', fontWeight: 'bold', color: '#1f2937', fontSize: '16px' }}>{currentUser}</span></div>
            <button onClick={() => { sessionStorage.clear(); navigate('/'); }} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>יציאה ➜</button>
          </div>
        </div>

        {/* סטטיסטיקה */}
        <div className="stats-grid">
          {[{ label: 'סריקות היום', value: stats.today, color: '#10b981' }, { label: 'סריקות השבוע', value: stats.week, color: '#f59e0b' }, { label: 'סה"כ מבוטחים', value: stats.month, color: '#3b82f6' }].map((stat, idx) => (
            <div key={idx} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: '#6b7280', marginBottom: '10px' }}>{stat.label}</div>
              <div style={{ fontSize: '42px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* גריד ראשי: טבלה + פיד */}
        <div className="main-grid" style={{ marginBottom: '30px' }}>

          {/* טבלת מבוטחים */}
          <div className="patients-panel" style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '500px', overflowY: 'auto' }}>
            <div className="table-header-row">
              <h3 style={{ margin: 0 }}>👥 מבוטחים ({filteredPatients.length})</h3>
              <input 
                type="text" 
                placeholder="🔍 חפש לפי שם, ת''ז או צמיד..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', width: '250px' }}
              />
              <div className="table-actions">
                <button onClick={exportToCSV} style={{ background: '#059669', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(5, 150, 105, 0.3)' }}>📊 ייצוא דו"ח מנהלים</button>
                <button onClick={handleAddPatient} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(37, 99, 235, 0.3)' }}>➕ הוסף מבוטח</button>
              </div>
            </div>
            <table className="patients-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'right', color: '#6b7280', fontSize: '14px', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '15px', width: '130px' }}>פעולות</th>
                  <th style={{ padding: '15px' }}>מחוז</th>
                  <th style={{ padding: '15px' }}>שם מלא</th>
                  <th style={{ padding: '15px' }}>טלפון</th>
                  <th style={{ padding: '15px' }}>מספר צמיד</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                      {accessLevel === 'master' && (
                        <button onClick={() => handleDelete(p.id)} style={{ ...btnIconStyle, background: '#ffebee', color: '#c62828', borderColor: '#ffcdd2' }} title="מחק">🗑️</button>
                      )}
                      <button onClick={() => startEdit(p)} style={{ ...btnIconStyle, background: 'white', color: '#555' }} title="ערוך">✏️</button>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '5px 12px', borderRadius: '20px', backgroundColor: '#e3f2fd', color: '#1976d2', fontSize: '12px', fontWeight: 'bold' }}>
                        {p.district === 'center' ? 'מרכז' : p.district === 'north' ? 'צפון' : p.district === 'south' ? 'דרום' : p.district}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '15px', color: '#333' }}>{p.fullName || '---'}</td>
                    <td style={{ padding: '10px', color: '#666' }}>{p.personalPhone}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.braceletId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* פיד סריקות */}
          <div className="scan-feed" style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '500px', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #f3f4f6', paddingBottom: '15px' }}>📡 סריקות אחרונות</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {scanFeed.length === 0 ? (<p style={{color: '#999', textAlign: 'center'}}>אין סריקות ב-24 שעות האחרונות</p>) : scanFeed.map((log) => {
                 const status = getEventStatus(log, logs);
                 return (
                    <div key={log.id} style={{ padding: '15px', borderRadius: '10px', backgroundColor: log.action.includes('FAIL') ? '#fef2f2' : '#f0f9ff', borderRight: `4px solid ${log.action.includes('FAIL') ? '#ef4444' : status.color}` }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{log.action === 'SCAN' ? '✅ סריקה' : '⚠️ שגיאה'}</span>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: status.color }} title={status.label}></div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : '---'}</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0d6efd', marginTop: '5px' }}>{log.details}</div>
                      {log.outcome && <div style={{ fontSize: '12px', color: '#059669', marginTop: '3px', fontWeight: 'bold' }}>{log.outcome === 'calmed_down' ? 'הרגעה' : log.outcome} ({log.duration_text})</div>}
                    </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* מפה */}
        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>🗺️ מפת תקריות (24 שעות אחרונות)</h3>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', fontSize: '14px', flexWrap: 'wrap' }}>
              <div style={{display:'flex', alignItems:'center', gap:'5px'}}><div style={{width:10, height:10, borderRadius:'50%', background:'#ef4444'}}></div> פתוח</div>
              <div style={{display:'flex', alignItems:'center', gap:'5px'}}><div style={{width:10, height:10, borderRadius:'50%', background:'#10b981'}}></div> סגור</div>
              <div style={{display:'flex', alignItems:'center', gap:'5px'}}><div style={{width:10, height:10, borderRadius:'50%', background:'#9ca3af'}}></div> לבירור</div>
          </div>
          <div className="map-container" style={{ height: '400px', borderRadius: '10px', overflow: 'hidden' }}>
            <MapContainer center={[32.0853, 34.7818]} zoom={8} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              {getMapMarkers().map((item: any) => (
                <CircleMarker key={item.id} center={item.pos} pathOptions={{ color: item.statusColor, fillColor: item.statusColor, fillOpacity: 0.8 }} radius={item.isGps ? 12 : 8}>
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>{item.fullName}</Tooltip>
                  <Popup>
                      <strong>{item.fullName}</strong><br/>
                      צמיד: {item.braceletId}<br/>
                      <div style={{display:'flex', alignItems:'center', gap:'5px', marginTop:'5px'}}>
                          סטטוס: <div style={{width:10, height:10, borderRadius:'50%', background: item.statusColor}}></div>
                      </div>
                      {item.isGps && <span style={{fontSize: '11px', color: '#059669'}}>📡 מיקום GPS</span>}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* מודל עריכה */}
        {editingPatient && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'right' }}>
              <h3 style={{color: '#2c3e50', textAlign: 'center', marginBottom: '25px', fontSize: '22px'}}>עריכה מלאה:</h3>
              <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>שם מלא:</label>
              <input type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box'}} />
              <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>מספר צמיד:</label>
              <input type="text" value={editForm.braceletId} onChange={e => setEditForm({...editForm, braceletId: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box'}} />
              <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>מחוז:</label>
              <select value={editForm.district} onChange={e => setEditForm({...editForm, district: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '8px', background: 'white', boxSizing: 'border-box'}}>
                  <option value="center">מרכז</option>
                  <option value="north">צפון</option>
                  <option value="south">דרום</option>
              </select>
              <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>טלפון:</label>
              <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box'}} />
              <label style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>מידע רפואי:</label>
              <textarea value={editForm.history} onChange={e => setEditForm({...editForm, history: e.target.value})} rows={4} style={{ width: '100%', padding: '12px', marginBottom: '25px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box'}} />
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => setEditingPatient(null)} style={{ flex: 1, padding: '12px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>ביטול</button>
                <button onClick={saveEdit} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>שמור</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPanel;
