import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Users, Activity, Download, Building2, Trash2, Plus, Edit2, Shield, UserPlus } from 'lucide-react';

interface Patient {
  id: string;
  fullName: string;
  idNumber: string; // חדש: תעודת זהות
  braceletId: string;
  district: string;
  city: string; // חדש: עיר
  personalPhone: string;
  emergencyContact: string; // חדש: איש קשר לחירום
  medicalHistory: string;
}

interface Authority {
  id: string;
  name: string;
  code: string;
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = sessionStorage.getItem('isAdmin');
  const accessLevel = sessionStorage.getItem('userRole');
  const currentUser = isAdmin ? (accessLevel === 'master' ? 'Master Admin' : 'Admin') : null;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [scanFeed, setScanFeed] = useState<any[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, scans24h: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals States - מעודכן עם השדות החדשים
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', idNumber: '', braceletId: '', district: 'מרכז', city: '', phone: '', emergencyContact: '', history: '' });
  
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({ fullName: '', idNumber: '', braceletId: '', district: 'מרכז', city: '', phone: '', emergencyContact: '', history: '' });
  
  const [showAddAuth, setShowAddAuth] = useState(false);
  const [newAuth, setNewAuth] = useState({ name: '', code: '' });

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
      const patList = patSnap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, ...data,
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`,
          idNumber: data.idNumber || '', // חילוץ תעודת זהות
          braceletId: data.tagId || d.id,
          district: data.district || 'מרכז',
          city: data.city || '', // חילוץ עיר
          personalPhone: data.patientPhone || data.phone || '',
          emergencyContact: data.emergencyContact || data.emergencyPhone || '', // חילוץ איש קשר
          medicalHistory: data.notes || data.medicalHistory || ''
        } as Patient;
      });
      setPatients(patList);

      const authSnap = await getDocs(collection(db, 'authorities'));
      const authList = authSnap.docs.map(d => ({ id: d.id, ...d.data() } as Authority));
      setAuthorities(authList);

      const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(500));
      const logSnap = await getDocs(q);
      const logList = logSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(logList);
      
      const scansOnly = logList.filter((l:any) => l.action === 'SCAN' || l.action === 'SCAN_FAIL');
      setScanFeed(scansOnly);
      
      const now = new Date().getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const scansInLast24h = scansOnly.filter((l: any) => {
        const logTime = l.timestamp?.toDate ? l.timestamp.toDate().getTime() : 0;
        return (now - logTime) <= oneDayMs;
      }).length;

      setStats({ totalUsers: patList.length, scans24h: scansInLast24h });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // --- Authorities Handlers ---
  const handleAddAuthority = async () => {
    if (!newAuth.name || !newAuth.code) return alert('נא למלא שם וקוד');
    try {
      await addDoc(collection(db, 'authorities'), newAuth);
      setNewAuth({ name: '', code: '' });
      setShowAddAuth(false);
      fetchData();
    } catch (e) {
      alert('שגיאה בהוספת רשות');
    }
  };

  const handleDeleteAuthority = async (id: string) => {
    if (window.confirm('האם למחוק רשות זו?')) {
      await deleteDoc(doc(db, 'authorities', id));
      fetchData();
    }
  };

  // --- Patients Handlers ---
  const handleAddPatient = async () => {
    if (!newPatientForm.fullName || !newPatientForm.braceletId || !newPatientForm.idNumber) {
        return alert('חובה להזין שם מלא, תעודת זהות ומספר צמיד');
    }
    try {
      await setDoc(doc(db, 'users', newPatientForm.braceletId), {
        fullName: newPatientForm.fullName,
        idNumber: newPatientForm.idNumber, // שמירת תעודת זהות
        tagId: newPatientForm.braceletId,
        district: newPatientForm.district,
        city: newPatientForm.city, // שמירת עיר
        patientPhone: newPatientForm.phone,
        emergencyContact: newPatientForm.emergencyContact, // שמירת איש קשר
        notes: newPatientForm.history,
        createdAt: new Date()
      });
      setShowAddPatient(false);
      setNewPatientForm({ fullName: '', idNumber: '', braceletId: '', district: 'מרכז', city: '', phone: '', emergencyContact: '', history: '' });
      fetchData();
    } catch (e) {
      alert('שגיאה בהוספת מבוטח');
    }
  };

  const saveEdit = async () => {
    if (!editingPatient) return;
    try {
      await updateDoc(doc(db, 'users', editingPatient.id), { 
        fullName: editForm.fullName, 
        idNumber: editForm.idNumber, // עדכון תעודת זהות
        tagId: editForm.braceletId, 
        district: editForm.district, 
        city: editForm.city, // עדכון עיר
        patientPhone: editForm.phone, 
        emergencyContact: editForm.emergencyContact, // עדכון איש קשר
        notes: editForm.history 
      });
      setEditingPatient(null);
      fetchData();
    } catch (e) {
      alert('שגיאה בשמירה');
    }
  };

  const handleDeletePatient = async (docId: string) => {
    if (accessLevel !== 'master') return alert('⛔ רק Master Admin מורשה למחוק');
    if (window.confirm('למחוק מבוטח לצמיתות?')) {
      await deleteDoc(doc(db, 'users', docId));
      fetchData();
    }
  };

  // --- Export & Map Logic ---
  const exportToCSV = () => {
    let csvContent = "תאריך,שעה,פעולה,מספר צמיד,תוצאה,הערות\n";
    logs.forEach(log => {
      const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
      const dateStr = dateObj.toLocaleDateString('he-IL');
      const timeStr = dateObj.toLocaleTimeString('he-IL');
      const action = log.action === 'SCAN' ? 'סריקה' : log.action === 'EVENT_RESOLVED' ? 'סיום אירוע' : log.action;
      const outcome = log.outcome || '---';
      const notes = (log.notes || '').replace(/,/g, ' ').replace(/\n/g, ' '); 
      csvContent += `${dateStr},${timeStr},${action},${log.details},${outcome},${notes}\n`;
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
      const diffMinutes = (new Date().getTime() - scanTime.getTime()) / 60000;
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
      let pos: [number, number] = scan.location?.lat && scan.location?.lng ? [scan.location.lat, scan.location.lng] : getFallbackPosition(patient.district);
      return { id: scan.id, fullName: patient.fullName, braceletId: patient.braceletId, pos, isGps: !!scan.location, statusColor: getEventStatus(scan, logs).color };
    }).filter(Boolean);
  };

  const filteredPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
        (p.fullName && p.fullName.toLowerCase().includes(term)) ||
        (p.braceletId && p.braceletId.includes(term)) ||
        (p.personalPhone && p.personalPhone.includes(term)) ||
        (p.idNumber && p.idNumber.includes(term)) // חיפוש גם לפי תעודת זהות
    );
  });

  if (!isAdmin) return null;

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '20px', direction: 'rtl' },
    card: { backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', marginBottom: '24px' },
    headerBox: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px' },
    flexWrap: { display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' },
    btnExit: { backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    titleLogo: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: 900, color: '#0f172a' },
    gridAutoFit: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' },
    statBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    statTitle: { color: '#64748b', fontWeight: 'bold', fontSize: '15px', margin: '0 0 5px 0' },
    statValue: { fontSize: '36px', fontWeight: 900, color: '#0f172a', margin: 0 },
    iconBoxBlue: { backgroundColor: '#dbeafe', color: '#2563eb', padding: '15px', borderRadius: '12px' },
    iconBoxOrange: { backgroundColor: '#ffedd5', color: '#ea580c', padding: '15px', borderRadius: '12px' },
    btnExport: { width: '100%', minHeight: '65px', background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' },
    sectionTitle: { fontSize: '20px', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 20px 0' },
    input: { padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    tableWrapper: { overflowX: 'auto', flexGrow: 1, border: '1px solid #f1f5f9', borderRadius: '12px' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '600px' },
    th: { padding: '12px 16px', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8fafc' },
    td: { padding: '16px', borderBottom: '1px solid #f8fafc', color: '#334155' },
    badge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
    feedItem: { padding: '16px', backgroundColor: '#f8fafc', borderRight: '4px solid #10b981', borderRadius: '8px', marginBottom: '12px' },
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' },
    btnPrimary: { width: '100%', padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    btnSecondary: { width: '100%', padding: '14px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    btnSuccess: { padding: '10px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    rowInputs: { display: 'flex', gap: '10px', marginBottom: '15px' } // סגנון חדש לשדות בשורה אחת
  };

  return (
    <div style={styles.page}>
      
      {/* HEADER */}
      <div style={{ ...styles.card, ...styles.headerBox }}>
        <div style={styles.flexWrap}>
            <button onClick={() => { sessionStorage.clear(); navigate('/'); }} style={styles.btnExit}>יציאה</button>
            <span style={{ fontWeight: 'bold', color: '#334155' }}>{currentUser}</span>
        </div>
        <div style={styles.titleLogo}>
            <Shield color="#2563eb" /> Recognition <span style={{ color: '#2563eb' }}>Live</span>
        </div>
      </div>

      {/* STATS & EXPORT */}
      <div style={styles.gridAutoFit}>
        <div style={{ ...styles.card, ...styles.statBox, marginBottom: 0 }}>
            <div>
                <p style={styles.statTitle}>מבוטחים במערכת</p>
                <h3 style={styles.statValue}>{stats.totalUsers}</h3>
            </div>
            <div style={styles.iconBoxBlue}><Users size={32} /></div>
        </div>
        
        <div style={{ ...styles.card, ...styles.statBox, marginBottom: 0 }}>
            <div>
                <p style={styles.statTitle}>סריקות (24 שעות)</p>
                <h3 style={styles.statValue}>{stats.scans24h}</h3>
            </div>
            <div style={styles.iconBoxOrange}><Activity size={32} /></div>
        </div>
        
        <div style={{ ...styles.card, padding: '16px', marginBottom: 0, display: 'flex', alignItems: 'center' }}>
            <button onClick={exportToCSV} style={styles.btnExport}>
                <Download size={24} /> הורד דוח מנהלים (CSV)
            </button>
        </div>
      </div>

      {/* AUTHORITIES MANAGEMENT */}
      <div style={styles.card}>
         <div style={styles.headerBox}>
            <h2 style={styles.sectionTitle}><Building2 color="#94a3b8"/> ניהול רשויות (קודים לשטח)</h2>
            <button onClick={() => setShowAddAuth(!showAddAuth)} style={{ padding: '10px 20px', backgroundColor: '#1e293b', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
               <Plus size={18}/> הוסף רשות
            </button>
         </div>

         {showAddAuth && (
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
               <div style={styles.gridAutoFit}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>שם הרשות (למשל: כיבוי אש)</label>
                    <input type="text" value={newAuth.name} onChange={e => setNewAuth({...newAuth, name: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>קוד פתיחה ייחודי</label>
                    <input type="text" value={newAuth.code} onChange={e => setNewAuth({...newAuth, code: e.target.value})} style={styles.input} placeholder="לדוגמה: 1002" />
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowAddAuth(false)} style={styles.btnSecondary}>ביטול</button>
                  <button onClick={handleAddAuthority} style={styles.btnPrimary}>שמור</button>
               </div>
            </div>
         )}

         <div style={styles.gridAutoFit}>
             {authorities.map(auth => (
                 <div key={auth.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                         <p style={{ fontWeight: 900, fontSize: '18px', margin: '0 0 4px 0', color: '#1e293b' }}>{auth.name}</p>
                         <span style={{ backgroundColor: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>קוד: {auth.code}</span>
                     </div>
                     <button onClick={() => handleDeleteAuthority(auth.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={20}/></button>
                 </div>
             ))}
             {authorities.length === 0 && <p style={{ color: '#94a3b8', fontSize: '14px', width: '100%' }}>לא הוגדרו רשויות במערכת.</p>}
         </div>
      </div>

      {/* MAIN GRID: TABLE, FEED */}
      <div style={{ ...styles.gridAutoFit, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          
        {/* PATIENTS TABLE */}
        <div style={{ ...styles.card, marginBottom: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '500px' }}>
          <div style={styles.headerBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <h2 style={styles.sectionTitle}><Users color="#94a3b8"/> מבוטחים ({filteredPatients.length})</h2>
                  <button onClick={() => setShowAddPatient(true)} style={styles.btnSuccess}>
                     <UserPlus size={18}/> הוסף מבוטח
                  </button>
              </div>
              <input type="text" placeholder="חיפוש חופשי (ת.ז, שם, טלפון)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...styles.input, width: '250px' }} />
          </div>
          
          <div style={styles.tableWrapper}>
              <table style={styles.table}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                          <th style={styles.th}>פעולות</th>
                          <th style={styles.th}>מחוז</th>
                          <th style={styles.th}>שם מלא</th>
                          <th style={styles.th}>תעודת זהות</th>
                          <th style={styles.th}>טלפון אישי</th>
                          <th style={styles.th}>איש קשר</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredPatients.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={styles.td}>
                                  <button onClick={() => { setEditingPatient(p); setEditForm({ fullName: p.fullName, idNumber: p.idNumber, braceletId: p.braceletId, district: p.district, city: p.city, phone: p.personalPhone, emergencyContact: p.emergencyContact, history: p.medicalHistory }); }} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', marginLeft: '5px' }}><Edit2 size={16}/></button>
                                  {accessLevel === 'master' && <button onClick={() => handleDeletePatient(p.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16}/></button>}
                              </td>
                              <td style={styles.td}><span style={styles.badge}>{p.district}</span></td>
                              <td style={{ ...styles.td, fontWeight: 900 }}>{p.fullName}</td>
                              <td style={styles.td}>{p.idNumber}</td>
                              <td style={styles.td}>{p.personalPhone}</td>
                              <td style={{ ...styles.td, color: '#dc2626' }}>{p.emergencyContact}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </div>

        {/* SCAN FEED */}
        <div style={{ ...styles.card, marginBottom: 0, height: '500px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={styles.sectionTitle}>📡 סריקות אחרונות</h2>
          <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '5px' }}>
             {scanFeed.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>אין סריקות לאחרונה</p> : 
              scanFeed.map(log => {
                 const status = getEventStatus(log, logs);
                 return (
                    <div key={log.id} style={{ ...styles.feedItem, borderRightColor: status.color }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#334155' }}>{log.action === 'SCAN' ? '✅ סריקה נכנסה' : '⚠️ שגיאה'}</span>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: status.color }} title={status.label}></div>
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px 0' }}>{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('he-IL') : '---'}</p>
                        <p style={{ fontWeight: 900, color: '#2563eb', margin: 0, fontSize: '14px' }}>צמיד: {log.details}</p>
                    </div>
                 )
              })
             }
          </div>
        </div>
      </div>

      {/* MAP */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>🗺️ מפת תקריות ארצית</h2>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }}></div> אירוע פתוח</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981' }}></div> סגור שטופל</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#9ca3af' }}></div> לבירור</span>
        </div>
        <div style={{ height: '400px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}>
          <MapContainer center={[32.0853, 34.7818]} zoom={8} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {getMapMarkers().map((item: any) => (
              <CircleMarker key={item.id} center={item.pos} pathOptions={{ color: item.statusColor, fillColor: item.statusColor, fillOpacity: 0.8 }} radius={item.isGps ? 12 : 8}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>{item.fullName}</Tooltip>
                <Popup>
                    <strong>{item.fullName}</strong><br/>
                    צמיד: {item.braceletId}<br/>
                    {item.isGps && <span style={{ color: '#059669', fontSize: '11px', fontWeight: 'bold' }}>📡 מיקום GPS מדויק</span>}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* ADD PATIENT MODAL - מעודכן עם השדות החדשים */}
      {showAddPatient && (
        <div style={styles.overlay}>
            <div style={{ ...styles.modal, maxWidth: '500px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 900, textAlign: 'center', margin: '0 0 24px 0' }}>הוספת מבוטח חדש</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={styles.rowInputs}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>שם מלא *</label>
                        <input type="text" value={newPatientForm.fullName} onChange={e => setNewPatientForm({...newPatientForm, fullName: e.target.value})} style={styles.input} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>תעודת זהות *</label>
                        <input type="text" value={newPatientForm.idNumber} onChange={e => setNewPatientForm({...newPatientForm, idNumber: e.target.value})} style={styles.input} />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מספר צמיד (NFC ID) *</label>
                    <input type="text" value={newPatientForm.braceletId} onChange={e => setNewPatientForm({...newPatientForm, braceletId: e.target.value})} style={styles.input} />
                </div>

                <div style={styles.rowInputs}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מחוז</label>
                        <select value={newPatientForm.district} onChange={e => setNewPatientForm({...newPatientForm, district: e.target.value})} style={styles.input}>
                            <option value="מרכז">מרכז</option>
                            <option value="צפון">צפון</option>
                            <option value="דרום">דרום</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>עיר</label>
                        <input type="text" value={newPatientForm.city} onChange={e => setNewPatientForm({...newPatientForm, city: e.target.value})} style={styles.input} />
                    </div>
                </div>

                <div style={styles.rowInputs}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>טלפון נייד</label>
                        <input type="text" value={newPatientForm.phone} onChange={e => setNewPatientForm({...newPatientForm, phone: e.target.value})} style={styles.input} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#dc2626', marginBottom: '5px' }}>איש קשר לחירום *</label>
                        <input type="text" value={newPatientForm.emergencyContact} onChange={e => setNewPatientForm({...newPatientForm, emergencyContact: e.target.value})} style={{ ...styles.input, borderColor: '#fca5a5', backgroundColor: '#fef2f2' }} />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מידע רפואי קריטי</label>
                    <textarea value={newPatientForm.history} onChange={e => setNewPatientForm({...newPatientForm, history: e.target.value})} rows={3} style={{ ...styles.input, resize: 'none' }} placeholder="רגישויות, מחלות רקע..." />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '24px' }}>
              <button onClick={() => setShowAddPatient(false)} style={styles.btnSecondary}>ביטול</button>
              <button onClick={handleAddPatient} style={styles.btnPrimary}>הוסף מבוטח</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PATIENT MODAL - מעודכן עם השדות החדשים */}
      {editingPatient && (
        <div style={styles.overlay}>
            <div style={{ ...styles.modal, maxWidth: '500px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 900, textAlign: 'center', margin: '0 0 24px 0' }}>עריכת מבוטח</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={styles.rowInputs}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>שם מלא</label>
                        <input type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} style={styles.input} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>תעודת זהות</label>
                        <input type="text" value={editForm.idNumber} onChange={e => setEditForm({...editForm, idNumber: e.target.value})} style={styles.input} />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מספר צמיד</label>
                    <input type="text" value={editForm.braceletId} onChange={e => setEditForm({...editForm, braceletId: e.target.value})} style={styles.input} disabled />
                </div>

                <div style={styles.rowInputs}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מחוז</label>
                        <select value={editForm.district} onChange={e => setEditForm({...editForm, district: e.target.value})} style={styles.input}>
                            <option value="מרכז">מרכז</option>
                            <option value="צפון">צפון</option>
                            <option value="דרום">דרום</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>עיר</label>
                        <input type="text" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} style={styles.input} />
                    </div>
                </div>

                <div style={styles.rowInputs}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>טלפון נייד</label>
                        <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} style={styles.input} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#dc2626', marginBottom: '5px' }}>איש קשר לחירום</label>
                        <input type="text" value={editForm.emergencyContact} onChange={e => setEditForm({...editForm, emergencyContact: e.target.value})} style={{ ...styles.input, borderColor: '#fca5a5', backgroundColor: '#fef2f2' }} />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מידע רפואי</label>
                    <textarea value={editForm.history} onChange={e => setEditForm({...editForm, history: e.target.value})} rows={3} style={{ ...styles.input, resize: 'none' }} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '24px' }}>
              <button onClick={() => setEditingPatient(null)} style={styles.btnSecondary}>ביטול</button>
              <button onClick={saveEdit} style={styles.btnPrimary}>שמור שינויים</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;