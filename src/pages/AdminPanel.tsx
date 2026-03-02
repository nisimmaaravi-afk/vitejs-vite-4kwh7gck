import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Download, Trash2, Edit2, Shield, UserPlus, Calendar, BarChart3, Building2, Plus } from 'lucide-react';

interface Patient {
  id: string;
  fullName: string;
  idNumber: string;
  braceletId: string;
  district: string;
  city: string;
  personalPhone: string;
  emergencyContact: string;
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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [scanFeed, setScanFeed] = useState<any[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', idNumber: '', braceletId: '', district: 'מרכז', city: '', phone: '', emergencyContact: '', history: '' });
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({ fullName: '', idNumber: '', braceletId: '', district: 'מרכז', city: '', phone: '', emergencyContact: '', history: '' });
  const [showAddAuth, setShowAddAuth] = useState(false);
  const [newAuth, setNewAuth] = useState({ name: '', code: '' });

  const districtsCoords: { [key: string]: [number, number] } = {
    'north': [32.8, 35.3], 'center': [32.08, 34.78], 'south': [31.25, 34.8], 'default': [31.4, 35.0]
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          idNumber: data.idNumber || '',
          braceletId: data.tagId || d.id,
          district: data.district || 'מרכז',
          city: data.city || '',
          personalPhone: data.patientPhone || data.phone || '',
          emergencyContact: data.emergencyContact || data.emergencyPhone || '',
          medicalHistory: data.notes || data.medicalHistory || ''
        } as Patient;
      });
      setPatients(patList);

      const authSnap = await getDocs(collection(db, 'authorities'));
      const authList = authSnap.docs.map(d => ({ id: d.id, ...d.data() } as Authority));
      setAuthorities(authList);

      const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(1500));
      const logSnap = await getDocs(q);
      const logList = logSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(logList);

      const scansOnly = logList.filter((l: any) => l.action === 'SCAN' || l.action === 'SCAN_FAIL');
      setScanFeed(scansOnly);
    } catch (error) { console.error("Error loading data:", error); }
  };

  const mapStats = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    const rangeLogs = logs.filter(l => {
      const t = l.timestamp?.toDate ? l.timestamp.toDate().getTime() : 0;
      return t >= start && t <= end;
    });
    const scans = rangeLogs.filter(l => l.action === 'SCAN').length;
    const resolved = rangeLogs.filter(l => l.action === 'EVENT_RESOLVED');
    return {
      totalScans: scans,
      totalResolved: resolved.length,
      rate: scans > 0 ? Math.round((resolved.length / scans) * 100) : 0
    };
  }, [logs, startDate, endDate]);

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleAddAuthority = async () => {
    if (!newAuth.name || !newAuth.code) return alert('נא למלא שם וקוד');
    try {
      await addDoc(collection(db, 'authorities'), newAuth);
      setNewAuth({ name: '', code: '' }); setShowAddAuth(false); fetchData();
    } catch (e) { alert('שגיאה'); }
  };

  const handleDeleteAuthority = async (id: string) => {
    if (window.confirm('למחוק רשות?')) { await deleteDoc(doc(db, 'authorities', id)); fetchData(); }
  };

  const handleAddPatient = async () => {
    if (!newPatientForm.fullName || !newPatientForm.braceletId || !newPatientForm.idNumber) return alert('חובה למלא הכל');
    try {
      await setDoc(doc(db, 'users', newPatientForm.braceletId), {
        fullName: newPatientForm.fullName, idNumber: newPatientForm.idNumber, tagId: newPatientForm.braceletId,
        district: newPatientForm.district, city: newPatientForm.city, patientPhone: newPatientForm.phone,
        emergencyContact: newPatientForm.emergencyContact, notes: newPatientForm.history, createdAt: new Date()
      });
      setShowAddPatient(false); fetchData();
    } catch (e) { alert('שגיאה'); }
  };

  const saveEdit = async () => {
    if (!editingPatient) return;
    try {
      await updateDoc(doc(db, 'users', editingPatient.id), {
        fullName: editForm.fullName, idNumber: editForm.idNumber, tagId: editForm.braceletId,
        district: editForm.district, city: editForm.city, patientPhone: editForm.phone,
        emergencyContact: editForm.emergencyContact, notes: editForm.history
      });
      setEditingPatient(null); fetchData();
    } catch (e) { alert('שגיאה'); }
  };

  const handleDeletePatient = async (docId: string) => {
    if (accessLevel !== 'master') return alert('רק Master Admin מורשה');
    if (window.confirm('למחוק?')) { await deleteDoc(doc(db, 'users', docId)); fetchData(); }
  };

  const exportToCSV = () => {
    let csvContent = "\uFEFF";
    csvContent += "תאריך,שעת התחלה,שעת סיום,משך האירוע,מספר צמיד,מספר סריקות,תוצאת האירוע,גוף מטפל,הערות\n";
    const sortedLogs = [...logs].sort((a, b) => (a.timestamp?.toDate()?.getTime() || 0) - (b.timestamp?.toDate()?.getTime() || 0));
    const incidents: any[] = [];
    const openIncidents: Record<string, any> = {};
    const translateOutcome = (val: string) => ({ 'calmed_down': 'הרגעה במקום', 'family_arrived': 'הגעת בן משפחה', 'ambulance': 'פינוי באמבולנס', 'police': 'גורמי ביטחון', 'refused_help': 'סירב לקבל עזרה' }[val] || val || 'טרם נסגר');
    const getAuthorityName = (c: string) => { if (!c) return 'סורק אנונימי'; const a = authorities.find(x => x.code === c || x.name === c); return a ? a.name : c; };
    const calcDur = (s: Date, e: Date | null) => { if (!e) return 'טרם נסגר'; const m = Math.floor((e.getTime() - s.getTime()) / 60000); return m < 1 ? 'פחות מדקה' : m < 60 ? `${m} דקות` : `${Math.floor(m / 60)} שעות ו-${m % 60} דקות`; };

    sortedLogs.forEach(log => {
      const tagId = log.details;
      const logTime = log.timestamp?.toDate() || new Date();
      if (log.action === 'SCAN') {
        if (!openIncidents[tagId]) openIncidents[tagId] = { date: logTime, initialScanTime: logTime, resolvedTime: null, tagId, scanCount: 1, outcome: '---', notes: '', authority: log.authority || '' };
        else openIncidents[tagId].scanCount += 1;
      } else if (log.action === 'EVENT_RESOLVED') {
        const inc = openIncidents[tagId] || { date: logTime, initialScanTime: logTime, tagId, scanCount: 1, authority: log.authority || '' };
        inc.resolvedTime = logTime;
        inc.outcome = translateOutcome(log.outcome);
        const rawNotes = log.freeText || log.notes || '';
        inc.notes = rawNotes.replace(/,/g, ' ').replace(/\n/g, ' - ');
        if (log.authority) inc.authority = log.authority;
        incidents.push(inc);
        if (openIncidents[tagId]) delete openIncidents[tagId];
      }
    });
    Object.values(openIncidents).forEach(inc => incidents.push(inc));
    incidents.sort((a, b) => b.date.getTime() - a.date.getTime());
    incidents.forEach(inc => {
      csvContent += `${inc.date.toLocaleDateString('he-IL')},${inc.initialScanTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })},${inc.resolvedTime ? inc.resolvedTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '---'},${calcDur(inc.initialScanTime, inc.resolvedTime)},${inc.tagId},${inc.scanCount},${inc.outcome},${getAuthorityName(inc.authority)},${inc.notes}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Recognition_Live_Report_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getMapMarkers = () => {
    return logs
      .filter((l: any) => {
        if (l.action !== 'SCAN' || !l.timestamp?.toDate) return false;
        const logDate = l.timestamp.toDate();
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        return logDate >= start && logDate <= end;
      })
      .map((scan: any) => {
        const patient = patients.find(p => p.braceletId === scan.details);
        if (!patient) return null;
        const pos: [number, number] = scan.location?.lat && scan.location?.lng
          ? [scan.location.lat, scan.location.lng]
          : getFallbackPosition(patient.district);
        return {
          id: scan.id, braceletId: patient.braceletId,
          pos, statusColor: getEventStatus(scan, logs).color
        };
      })
      .filter(Boolean);
  };

  const getFallbackPosition = (district: string): [number, number] => {
    const d = String(district || 'default').toLowerCase();
    const base = districtsCoords[d] || districtsCoords['default'];
    return [base[0] + (Math.random() * 0.04 - 0.02), base[1] + (Math.random() * 0.04 - 0.02)];
  };

  const getEventStatus = (scanLog: any, allLogs: any[]) => {
    const scanTime = scanLog.timestamp?.toDate ? scanLog.timestamp.toDate() : new Date();
    const resolved = allLogs.find(l => l.action === 'EVENT_RESOLVED' && l.details === scanLog.details && l.timestamp?.toDate() > scanTime);
    return resolved ? { color: '#10b981' } : { color: '#ef4444' };
  };

  const filteredPatients = patients.filter(p => {
    const t = searchTerm.toLowerCase();
    return (p.fullName?.toLowerCase().includes(t)) || (p.braceletId?.includes(t)) || (p.personalPhone?.includes(t)) || (p.idNumber?.includes(t));
  });

  if (!isAdmin) return null;

  const s: Record<string, React.CSSProperties> = {
    card: { backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' },
    input: { padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    th: { padding: '10px 12px', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8fafc', fontSize: '13px' },
    td: { padding: '12px', borderBottom: '1px solid #f8fafc', color: '#334155', fontSize: '13px' },
    badge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
    feedItem: { padding: '14px', backgroundColor: '#f8fafc', borderRight: '4px solid #10b981', borderRadius: '8px', marginBottom: '10px' },
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
    modal: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
    btnPrimary: { width: '100%', padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    btnSecondary: { width: '100%', padding: '14px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    dateInput: { padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none' }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif', direction: 'rtl', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      
      {/* HEADER */}
      <div style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'white', borderBottom: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '12px 16px' : '16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => { sessionStorage.clear(); navigate('/'); }} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>יציאה</button>
          <span style={{ fontWeight: 'bold', color: '#334155', fontSize: isMobile ? '13px' : '15px' }}>{currentUser}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '18px' : '24px', fontWeight: 900, color: '#0f172a' }}>
          <Shield color="#2563eb" size={isMobile ? 18 : 24} /> Recognition <span style={{ color: '#2563eb' }}>Live</span>
        </div>
      </div>

      <div style={{ padding: isMobile ? '16px' : '32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '32px' }}>
        
        {/* עמודה ימנית (ראשית) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* סטטיסטיקות */}
          <div style={{ ...s.card, background: 'linear-gradient(to bottom left, #ffffff, #f8fafc)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BarChart3 color="#2563eb" /> ניתוח אירועים מרחבי
                </h2>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>נתונים לפי טווח זמנים נבחר</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: 'white', padding: '10px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[{l:'יום', d:1}, {l:'שבוע', d:7}, {l:'חודש', d:30}, {l:'שנה', d:365}].map(b => (
                    <button key={b.l} onClick={() => setQuickRange(b.d)} style={{ padding: '6px 12px', fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: 'white', fontWeight: 'bold', color: '#475569' }}>{b.l}</button>
                  ))}
                </div>
                <div style={{ borderLeft: '1px solid #e2e8f0', height: '24px', margin: '0 8px' }}></div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Calendar size={16} color="#2563eb" />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={s.dateInput} />
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={s.dateInput} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>סך סריקות בטווח</p>
                <h4 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0 }}>{mapStats.totalScans}</h4>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>אירועים שנסגרו</p>
                <h4 style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', margin: 0 }}>{mapStats.totalResolved}</h4>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>יחס טיפול (Success)</p>
                <h4 style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb', margin: 0 }}>{mapStats.rate}%</h4>
              </div>
            </div>
          </div>

          {/* מפה */}
          <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
             <div style={{ height: '500px', width: '100%' }}>
              <MapContainer center={[32.0853, 34.7818]} zoom={8} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {getMapMarkers().map((item: any) => (
                  <CircleMarker key={item.id} center={item.pos} pathOptions={{ color: item.statusColor, fillColor: item.statusColor, fillOpacity: 0.8 }} radius={10}>
                    <Popup>
                      <div style={{ direction: 'rtl', textAlign: 'right' }}>
                        <span style={{ color: '#64748b' }}>צמיד: {item.braceletId}</span><br />
                        <div style={{ marginTop: '8px', padding: '4px 8px', borderRadius: '6px', background: item.statusColor + '20', color: item.statusColor, fontWeight: 'bold', display: 'inline-block', fontSize: '11px' }}>
                          {item.statusColor === '#ef4444' ? '🚨 אירוע פתוח' : '✅ טופל'}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* טבלת מבוטחים */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900 }}>ניהול מבוטחים ({filteredPatients.length})</h2>
              <button onClick={() => setShowAddPatient(true)} style={{ padding: '10px 18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} /> הוסף מבוטח
              </button>
            </div>
            <input type="text" placeholder="חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...s.input, marginBottom: '16px' }} />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr>
                    <th style={s.th}>פעולות</th>
                    <th style={s.th}>שם מלא</th>
                    <th style={s.th}>מחוז</th>
                    <th style={s.th}>ת.ז</th>
                    <th style={s.th}>טלפון</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => (
                    <tr key={p.id}>
                      <td style={s.td}>
                        <button onClick={() => { setEditingPatient(p); setEditForm({ fullName: p.fullName, idNumber: p.idNumber, braceletId: p.braceletId, district: p.district, city: p.city, phone: p.personalPhone, emergencyContact: p.emergencyContact, history: p.medicalHistory }); }} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginLeft: '6px' }}><Edit2 size={15} /></button>
                        {accessLevel === 'master' && <button onClick={() => handleDeletePatient(p.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={15} /></button>}
                      </td>
                      <td style={{ ...s.td, fontWeight: 900 }}>{p.fullName}</td>
                      <td style={s.td}><span style={s.badge}>{p.district}</span></td>
                      <td style={s.td}>{p.idNumber}</td>
                      <td style={s.td}>{p.personalPhone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* עמודה שמאלית (צדדית) */}
        <div style={{ width: isMobile ? '100%' : '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <button onClick={exportToCSV} style={{ ...s.btnPrimary, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', height: '60px', marginTop: 0, fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
            <Download size={22} /> הורד דוח מנהלים (CSV)
          </button>
          
          <div style={s.card}>
            <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px' }}>📡 סריקות אחרונות</h2>
            <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
              {scanFeed.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center' }}>אין סריקות</p> : scanFeed.map(log => (
                <div key={log.id} style={{ ...s.feedItem, background: '#f8fafc' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '13px', margin: 0 }}>{log.action === 'SCAN' ? 'סריקת צמיד' : 'שגיאה'}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0' }}>{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('he-IL') : '---'}</p>
                  <p style={{ fontWeight: 900, color: '#2563eb', fontSize: '14px', margin: 0 }}>צמיד: {log.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* מודול רשויות מטפלות שהוחזר */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#64748b" /> רשויות מטפלות
              </h2>
              <button onClick={() => setShowAddAuth(!showAddAuth)} style={{ padding: '6px 10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <Plus size={16} />
              </button>
            </div>
            
            {showAddAuth && (
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <input type="text" placeholder="שם הגוף (למשל: משטרה)" value={newAuth.name} onChange={e => setNewAuth({ ...newAuth, name: e.target.value })} style={{ ...s.input, marginBottom: '8px', padding: '8px' }} />
                <input type="text" placeholder="קוד גישה סודי" value={newAuth.code} onChange={e => setNewAuth({ ...newAuth, code: e.target.value })} style={{ ...s.input, marginBottom: '8px', padding: '8px' }} />
                <button onClick={handleAddAuthority} style={{ ...s.btnPrimary, padding: '8px', marginTop: 0 }}>הוסף רשות</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {authorities.map(auth => (
                <div key={auth.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '13px', margin: 0 }}>{auth.name}</p>
                    <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 'bold' }}>קוד: {auth.code}</span>
                  </div>
                  <button onClick={() => handleDeleteAuthority(auth.id)} style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* מודלים */}
      {showAddPatient && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ textAlign: 'center', fontWeight: 900, fontSize: '22px', marginBottom: '24px' }}>רישום מבוטח חדש</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="שם מלא" value={newPatientForm.fullName} onChange={e => setNewPatientForm({ ...newPatientForm, fullName: e.target.value })} style={s.input} />
              <div style={{ display: 'flex', gap: '12px' }}>
                 <input type="text" placeholder="תעודת זהות" value={newPatientForm.idNumber} onChange={e => setNewPatientForm({ ...newPatientForm, idNumber: e.target.value })} style={{ ...s.input, flex: 1 }} />
                 <input type="text" placeholder="מחוז" value={newPatientForm.district} onChange={e => setNewPatientForm({ ...newPatientForm, district: e.target.value })} style={{ ...s.input, flex: 1 }} />
              </div>
              <input type="text" placeholder="מספר צמיד" value={newPatientForm.braceletId} onChange={e => setNewPatientForm({ ...newPatientForm, braceletId: e.target.value })} style={s.input} />
              <div style={{ display: 'flex', gap: '12px' }}>
                 <input type="text" placeholder="טלפון" value={newPatientForm.phone} onChange={e => setNewPatientForm({ ...newPatientForm, phone: e.target.value })} style={{ ...s.input, flex: 1 }} />
                 <input type="text" placeholder="איש קשר חירום" value={newPatientForm.emergencyContact} onChange={e => setNewPatientForm({ ...newPatientForm, emergencyContact: e.target.value })} style={{ ...s.input, flex: 1 }} />
              </div>
              <textarea placeholder="מידע רפואי" value={newPatientForm.history} onChange={e => setNewPatientForm({ ...newPatientForm, history: e.target.value })} style={{ ...s.input, height: '100px' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowAddPatient(false)} style={s.btnSecondary}>ביטול</button>
              <button onClick={handleAddPatient} style={s.btnPrimary}>שמור</button>
            </div>
          </div>
        </div>
      )}

      {editingPatient && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ textAlign: 'center', fontWeight: 900, fontSize: '22px', marginBottom: '24px' }}>עריכת פרטי מבוטח</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} style={s.input} />
              <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={s.input} />
              <input type="text" value={editForm.emergencyContact} onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })} style={s.input} />
              <textarea value={editForm.history} onChange={e => setEditForm({ ...editForm, history: e.target.value })} style={{ ...s.input, height: '100px' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setEditingPatient(null)} style={s.btnSecondary}>ביטול</button>
              <button onClick={saveEdit} style={s.btnPrimary}>עדכן</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;