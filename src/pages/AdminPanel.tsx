import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, getDoc, deleteDoc, doc, updateDoc, addDoc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Users, Activity, Download, Building2, Trash2, Plus, Edit2, Shield, UserPlus, Pause, Play, Calendar, PieChart, FileText } from 'lucide-react';

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
  status?: string;
  legalConsent?: any;
}

interface Authority {
  id: string;
  name: string;
  code: string;
}

const getLocalISODate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const parseDateString = (dateStr: string, isEndOfDay: boolean) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  if (isEndOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.getTime();
};

const formatDistrict = (val: string) => {
  if (!val) return 'לא הוגדר';
  const lower = val.toLowerCase();
  if (lower === 'center') return 'מרכז';
  if (lower === 'north') return 'צפון';
  if (lower === 'south') return 'דרום';
  return val;
};

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
  const [stats, setStats] = useState({ totalUsers: 0, scans24h: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const [visiblePatientsCount, setVisiblePatientsCount] = useState(50);
  const [visibleFeedCount, setVisibleFeedCount] = useState(50);

  // ---- State למערכת תנאי השימוש והפרטיות (Legal) ----
  const [termsText, setTermsText] = useState('');
  const [privacyText, setPrivacyText] = useState('');
  const [legalEditTab, setLegalEditTab] = useState<'terms' | 'privacy'>('terms');
  const [showTermsEdit, setShowTermsEdit] = useState(false);
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [consentModalData, setConsentModalData] = useState<Patient | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalISODate(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalISODate(new Date()));

  const [activeMapFilters, setActiveMapFilters] = useState({ open: true, resolved: true, inquiry: true });
  const [mapViewMode, setMapViewMode] = useState<'pins' | 'heat'>('pins');

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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    } else {
      fetchData(); 
    }
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    try {
      const patSnap = await getDocs(collection(db, 'users'));
      const patList = patSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`,
          idNumber: data.idNumber || '',
          braceletId: data.tagId || d.id,
          district: data.district || 'מרכז',
          city: data.city || '',
          personalPhone: data.patientPhone || data.phone || '',
          emergencyContact: data.emergencyContact || data.emergencyPhone || '',
          medicalHistory: data.notes || data.medicalHistory || '',
          status: data.status || 'active',
          legalConsent: data.legalConsent || null
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

      const now = new Date().getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const scansInLast24h = scansOnly.filter((l: any) => {
        const logTime = l.timestamp?.toDate ? l.timestamp.toDate().getTime() : 0;
        return (now - logTime) <= oneDayMs;
      }).length;

      setStats({ totalUsers: patList.length, scans24h: scansInLast24h });

      // שאיבת תקנון תנאי שימוש
      const termsSnap = await getDoc(doc(db, 'settings', 'terms'));
      if (termsSnap.exists() && termsSnap.data().text) {
        setTermsText(termsSnap.data().text);
      } else {
        setTermsText("1. כללי\nמערכת Recognition Live נועדה לשמש ככלי טכנולוגי מסייע לזיהוי וניהול מקרי מצוקה בלבד.\n\n2. הסרת אחריות מוחלטת\nהמפתחים אינם נושאים באחריות משפטית, פלילית או אזרחית לנזק ישיר או עקיף.");
      }

      // שאיבת מדיניות פרטיות
      const privacySnap = await getDoc(doc(db, 'settings', 'privacy'));
      if (privacySnap.exists() && privacySnap.data().text) {
        setPrivacyText(privacySnap.data().text);
      } else {
        setPrivacyText("מדיניות פרטיות:\n\n1. איסוף נתונים\nאנו מתעדים ושומרים פרטים כגון כתובת IP, חותמת זמן וסוג דפדפן לצורכי אבטחה, בקרה משפטית ומניעת הונאות.\n\n2. שיתוף מידע\nהמידע מוצג אך ורק לגורמי הצלה וביטחון מורשים.");
      }

    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSaveTerms = async () => {
    setIsSavingTerms(true);
    try {
      await setDoc(doc(db, 'settings', 'terms'), { text: termsText, updatedAt: new Date() }, { merge: true });
      await setDoc(doc(db, 'settings', 'privacy'), { text: privacyText, updatedAt: new Date() }, { merge: true });
      setShowTermsEdit(false);
      alert('המסמכים המשפטיים נשמרו בהצלחה!');
    } catch (error) {
      console.error("Error saving terms:", error);
      alert('שגיאה בשמירת המסמכים.');
    }
    setIsSavingTerms(false);
  };

  const mapStats = useMemo(() => {
    const startMs = parseDateString(startDate, false);
    const endMs = parseDateString(endDate, true);
    
    const rangeLogs = logs.filter(l => {
      const t = l.timestamp?.toDate ? l.timestamp.toDate().getTime() : 0;
      return t >= startMs && t <= endMs;
    });

    const scans = rangeLogs.filter(l => l.action === 'SCAN').length;
    const resolved = rangeLogs.filter(l => l.action === 'EVENT_RESOLVED');
    
    const outcomesCount: Record<string, number> = {};
    const authCount: Record<string, number> = {};

    resolved.forEach(r => {
      const o = r.outcome || 'אחר';
      outcomesCount[o] = (outcomesCount[o] || 0) + 1;

      const a = r.authority || 'אנונימי / אחר';
      authCount[a] = (authCount[a] || 0) + 1;
    });

    const translate = (key: string) => ({
      'calmed_down': 'הרגעה', 'family_arrived': 'משפחה', 'ambulance': 'מד"א', 'police': 'משטרה', 'refused_help': 'סירוב'
    }[key] || key);

    const authColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e'];
    let currentPercent = 0;
    const authorities = Object.entries(authCount)
      .sort((a, b) => b[1] - a[1]) 
      .map(([name, value], idx) => {
        const pct = (value / resolved.length) * 100;
        const color = authColors[idx % authColors.length];
        const start = currentPercent;
        currentPercent += pct;
        return { name, value, color, start, end: currentPercent };
    });

    const conicString = authorities.map(a => `${a.color} ${a.start}% ${a.end}%`).join(', ');
    
    const outcomeColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const outcomes = Object.entries(outcomesCount).map(([name, value], idx) => ({
      name: translate(name),
      value,
      color: outcomeColors[idx % outcomeColors.length]
    })).sort((a, b) => b.value - a.value);

    return {
      totalScans: scans,
      totalResolved: resolved.length,
      rate: scans > 0 ? Math.round((resolved.length / scans) * 100) : 0,
      outcomes,
      authorities,
      conicString
    };
  }, [logs, startDate, endDate]);

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(getLocalISODate(start));
    setEndDate(getLocalISODate(end));
  };

  const handleAddAuthority = async () => {
    if (!newAuth.name || !newAuth.code) return alert('נא למלא שם וקוד');
    try {
      await addDoc(collection(db, 'authorities'), newAuth);
      setNewAuth({ name: '', code: '' });
      setShowAddAuth(false);
      fetchData();
    } catch (e) { alert('שגיאה בהוספת רשות'); }
  };

  const handleDeleteAuthority = async (id: string) => {
    if (window.confirm('האם למחוק רשות זו?')) {
      await deleteDoc(doc(db, 'authorities', id));
      fetchData();
    }
  };

  const handleAddPatient = async () => {
    if (!newPatientForm.fullName || !newPatientForm.braceletId || !newPatientForm.idNumber)
      return alert('חובה להזין שם מלא, תעודת זהות ומספר צמיד');
    try {
      await setDoc(doc(db, 'users', newPatientForm.braceletId), {
        fullName: newPatientForm.fullName, idNumber: newPatientForm.idNumber,
        tagId: newPatientForm.braceletId, district: newPatientForm.district,
        city: newPatientForm.city, patientPhone: newPatientForm.phone,
        emergencyContact: newPatientForm.emergencyContact, notes: newPatientForm.history,
        status: 'active',
        createdAt: new Date()
      });
      setShowAddPatient(false);
      setNewPatientForm({ fullName: '', idNumber: '', braceletId: '', district: 'מרכז', city: '', phone: '', emergencyContact: '', history: '' });
      fetchData();
    } catch (e) { alert('שגיאה בהוספת מבוטח'); }
  };

  const saveEdit = async () => {
    if (!editingPatient) return;
    try {
      await updateDoc(doc(db, 'users', editingPatient.id), {
        fullName: editForm.fullName, idNumber: editForm.idNumber, tagId: editForm.braceletId,
        district: editForm.district, city: editForm.city, patientPhone: editForm.phone,
        emergencyContact: editForm.emergencyContact, notes: editForm.history
      });
      setEditingPatient(null);
      fetchData();
    } catch (e) { alert('שגיאה בשמירה'); }
  };

  const toggleFreezeStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen';
    const actionText = newStatus === 'frozen' ? 'להקפיא' : 'להפעיל מחדש';
    if (window.confirm(`האם אתה בטוח שברצונך ${actionText} צמיד זה?`)) {
      try {
        await updateDoc(doc(db, 'users', id), { status: newStatus });
        fetchData();
      } catch (e) {
        alert('שגיאה בעדכון סטטוס המבוטח');
      }
    }
  };

  const handleDeletePatient = async (docId: string) => {
    if (accessLevel !== 'master') return alert('⛔ רק Master Admin מורשה למחוק');
    if (window.confirm('האם אתה בטוח שברצונך למחוק מבוטח זה לצמיתות? מחיקה זו לא ניתנת לביטול.')) {
      await deleteDoc(doc(db, 'users', docId));
      fetchData();
    }
  };

  const exportToCSV = () => {
    let csvContent = "\uFEFF";
    csvContent += "תאריך,שעת התחלה,שעת סיום,משך האירוע,מספר צמיד,מספר סריקות,תוצאת האירוע,גוף מטפל,הערות\n";
    const sortedLogs = [...logs].sort((a, b) => (a.timestamp?.toDate()?.getTime() || 0) - (b.timestamp?.toDate()?.getTime() || 0));
    const incidents: any[] = [];
    const openIncidents: Record<string, any> = {};
    const translateOutcome = (val: string) => ({ 'calmed_down': 'הרגעה במקום', 'family_arrived': 'הגעת בן משפחה', 'ambulance': 'פינוי באמבולנס', 'police': 'גורמי ביטחון', 'refused_help': 'סירב לקבל עזרה' }[val] || val || 'טרם נסגר');
    const getAuthorityName = (c: string) => { if (!c) return 'סורק אנונימי'; const a = authorities.find(x => x.code === c || x.name === c); return a ? a.name : c; };
    const calcDur = (s: Date, e: Date | null) => { if (!e) return 'טרם נסגר'; const m = Math.floor((e.getTime() - s.getTime()) / 60000); if (m < 1) return 'פחות מדקה'; if (m < 60) return `${m} דקות`; return `${Math.floor(m / 60)} שעות ו-${m % 60} דקות`; };
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

  const getFallbackPosition = (district: string): [number, number] => {
    const d = String(district || 'default').toLowerCase();
    const base = districtsCoords[d] || districtsCoords['default'];
    return [base[0] + (Math.random() * 0.04 - 0.02), base[1] + (Math.random() * 0.04 - 0.02)];
  };

  const getEventStatus = (scanLog: any, allLogs: any[]) => {
    const scanTime = scanLog.timestamp?.toDate ? scanLog.timestamp.toDate() : new Date();
    const diff = (new Date().getTime() - scanTime.getTime()) / 60000;
    const resolved = allLogs.find(l => l.action === 'EVENT_RESOLVED' && l.details === scanLog.details && l.timestamp?.toDate() > scanTime);
    if (resolved) return { color: '#10b981', label: 'סגור', key: 'resolved' };
    if (diff > 60) return { color: '#9ca3af', label: 'לבירור', key: 'inquiry' };
    return { color: '#ef4444', label: 'פתוח', key: 'open' };
  };

  const getMapMarkers = () => {
    const startMs = parseDateString(startDate, false);
    const endMs = parseDateString(endDate, true);

    return logs
      .filter((l: any) => {
        if (l.action !== 'SCAN' || !l.timestamp?.toDate) return false;
        const t = l.timestamp.toDate().getTime();
        return t >= startMs && t <= endMs;
      })
      .map((scan: any) => {
        const patient = patients.find(p => p.braceletId === scan.details);
        if (!patient) return null;
        const pos: [number, number] = scan.location?.lat && scan.location?.lng 
          ? [scan.location.lat, scan.location.lng] 
          : getFallbackPosition(patient.district);
          
        const statusData = getEventStatus(scan, logs);

        return { 
          id: scan.id, 
          fullName: patient.fullName, 
          braceletId: patient.braceletId, 
          pos, 
          isGps: !!scan.location, 
          statusColor: statusData.color,
          statusKey: statusData.key
        };
      })
      .filter((item: any) => {
         if (!item) return false;
         if (item.statusKey === 'open' && !activeMapFilters.open) return false;
         if (item.statusKey === 'resolved' && !activeMapFilters.resolved) return false;
         if (item.statusKey === 'inquiry' && !activeMapFilters.inquiry) return false;
         return true;
      });
  };

  const filteredPatients = patients.filter(p => {
    const t = searchTerm.trim().toLowerCase();
    if (t === 'מוקפא') return p.status === 'frozen';
    return (p.fullName?.toLowerCase().includes(t)) || (p.braceletId?.includes(t)) || (p.personalPhone?.includes(t)) || (p.idNumber?.includes(t));
  });

  const MapHeaderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 900, color: '#1e293b', margin: 0 }}>🗺️ מפת תקריות ארצית</h2>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
          <button onClick={() => setMapViewMode('pins')} style={{ padding: '4px 12px', border: 'none', borderRadius: '6px', background: mapViewMode === 'pins' ? 'white' : 'transparent', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', boxShadow: mapViewMode === 'pins' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: '#334155' }}>נקודות דיוק</button>
          <button onClick={() => setMapViewMode('heat')} style={{ padding: '4px 12px', border: 'none', borderRadius: '6px', background: mapViewMode === 'heat' ? 'white' : 'transparent', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', boxShadow: mapViewMode === 'heat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: '#334155' }}>ריכוז אזורי</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '15px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
        <span onClick={() => setActiveMapFilters(prev => ({...prev, open: !prev.open}))} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', opacity: activeMapFilters.open ? 1 : 0.4, transition: 'opacity 0.2s' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }}></div> פתוח
        </span>
        <span onClick={() => setActiveMapFilters(prev => ({...prev, resolved: !prev.resolved}))} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', opacity: activeMapFilters.resolved ? 1 : 0.4, transition: 'opacity 0.2s' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981' }}></div> שטופל
        </span>
        <span onClick={() => setActiveMapFilters(prev => ({...prev, inquiry: !prev.inquiry}))} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', opacity: activeMapFilters.inquiry ? 1 : 0.4, transition: 'opacity 0.2s' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#9ca3af' }}></div> לבירור
        </span>
      </div>
    </div>
  );

  if (!isAdmin) return null;

  const s: Record<string, React.CSSProperties> = {
    card: { backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' },
    input: { padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    th: { padding: '10px 12px', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8fafc', fontSize: '13px' },
    td: { padding: '12px', borderBottom: '1px solid #f8fafc', color: '#334155', fontSize: '13px' },
    badge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
    frozenBadge: { backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', marginRight: '6px' },
    feedItem: { padding: '14px', backgroundColor: '#f8fafc', borderRight: '4px solid #10b981', borderRadius: '8px', marginBottom: '10px' },
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
    modal: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
    btnPrimary: { width: '100%', padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    btnSecondary: { width: '100%', padding: '14px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    rowInputs: { display: 'flex', gap: '10px', marginBottom: '15px' },
    actionBtn: { border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', marginLeft: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
    dateInput: { padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', outline: 'none' },
    loadMoreBtn: { width: '100%', padding: '10px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }
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

      {/* BODY - MOBILE */}
      {isMobile ? (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px', margin: '0 0 4px 0' }}>מבוטחים</p>
                <h3 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0 }}>{stats.totalUsers}</h3>
              </div>
              <div style={{ backgroundColor: '#dbeafe', color: '#2563eb', padding: '10px', borderRadius: '10px' }}><Users size={22} /></div>
            </div>
            <div style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px', margin: '0 0 4px 0' }}>סריקות 24 שעות</p>
                <h3 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0 }}>{stats.scans24h}</h3>
              </div>
              <div style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: '10px', borderRadius: '10px' }}><Activity size={22} /></div>
            </div>
          </div>

          <button onClick={exportToCSV} style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <Download size={20} /> הורד דוח מנהלים (CSV)
          </button>

          <div style={{ ...s.card, background: 'linear-gradient(to bottom left, #ffffff, #f8fafc)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PieChart color="#2563eb" size={20} /> ניתוח מרחבי
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[{l:'יום', d:1}, {l:'שבוע', d:7}, {l:'חודש', d:30}, {l:'שנה', d:365}].map(b => (
                    <button key={b.l} onClick={() => setQuickRange(b.d)} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: 'white', fontWeight: 'bold', color: '#475569', flex: 1 }}>{b.l}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{...s.dateInput, flex: 1}} />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{...s.dateInput, flex: 1}} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>סריקות</p>
                <h4 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>{mapStats.totalScans}</h4>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>נסגרו</p>
                <h4 style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', margin: 0 }}>{mapStats.totalResolved}</h4>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>יחס טיפול</p>
                <h4 style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb', margin: 0 }}>{mapStats.rate}%</h4>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginBottom: '12px' }}>גוף מטפל</p>
                {mapStats.authorities.length === 0 ? (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f1f5f9' }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `conic-gradient(${mapStats.conicString})`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', width: '100%', alignItems: 'flex-start', paddingLeft: '10px' }}>
                  {mapStats.authorities.map((a, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', fontWeight: '500' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} /> 
                      <span>{a.name} ({a.value})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
                <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>תוצאת סיום</p>
                <div style={{ display: 'flex', gap: '2px', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                  {mapStats.outcomes.length === 0 ? <div style={{ flex: 1, backgroundColor: '#f1f5f9' }} /> : 
                    mapStats.outcomes.map((o, idx) => (
                      <div key={idx} style={{ flex: o.value, backgroundColor: o.color }} />
                    ))
                  }
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'flex-start', paddingLeft: '10px' }}>
                  {mapStats.outcomes.map((o, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', fontWeight: '500' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: o.color, flexShrink: 0 }} /> 
                      <span>{o.name} ({o.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <MapHeaderControls />
            <div style={{ height: '280px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <MapContainer center={[32.0853, 34.7818]} zoom={7} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                {getMapMarkers().map((item: any) => (
                  <CircleMarker 
                    key={item.id} 
                    center={item.pos} 
                    pathOptions={{ 
                      color: mapViewMode === 'heat' ? 'transparent' : item.statusColor, 
                      fillColor: item.statusColor, 
                      fillOpacity: mapViewMode === 'heat' ? 0.3 : 0.8 
                    }} 
                    radius={mapViewMode === 'heat' ? 25 : (item.isGps ? 8 : 5)}
                  >
                    {mapViewMode === 'pins' && (
                      <Popup><strong>מספר צמיד:</strong><br />{item.braceletId}</Popup>
                    )}
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b', margin: 0 }}>מבוטחים ({filteredPatients.length})</h2>
              <button onClick={() => setShowAddPatient(true)} style={{ padding: '8px 14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <UserPlus size={16} /> הוסף
              </button>
            </div>
            <input type="text" placeholder="חיפוש (ת.ז, שם או הקלד 'מוקפא')..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...s.input, marginBottom: '12px' }} />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '500px' }}>
                <thead>
                  <tr>
                    <th style={s.th}>פעולות</th>
                    <th style={s.th}>שם מלא</th>
                    <th style={s.th}>ת.ז</th>
                    <th style={s.th}>איש קשר בחירום</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.slice(0, visiblePatientsCount).map(p => (
                    <tr key={p.id} style={{ backgroundColor: p.status === 'frozen' ? '#fafafa' : 'transparent', opacity: p.status === 'frozen' ? 0.8 : 1 }}>
                      <td style={s.td}>
                        <button onClick={() => { setEditingPatient(p); setEditForm({ fullName: p.fullName, idNumber: p.idNumber, braceletId: p.braceletId, district: formatDistrict(p.district), city: p.city, phone: p.personalPhone, emergencyContact: p.emergencyContact, history: p.medicalHistory }); }} style={{ ...s.actionBtn, background: '#f1f5f9', color: '#475569' }} title="ערוך"><Edit2 size={14} /></button>
                        <button onClick={() => toggleFreezeStatus(p.id, p.status || 'active')} style={{ ...s.actionBtn, background: p.status === 'frozen' ? '#dcfce3' : '#fef08a', color: p.status === 'frozen' ? '#166534' : '#854d0e' }} title={p.status === 'frozen' ? 'הפעל מחדש' : 'הקפא צמיד'}>
                          {p.status === 'frozen' ? <Play size={14} /> : <Pause size={14} />}
                        </button>
                        {accessLevel === 'master' && <button onClick={() => handleDeletePatient(p.id)} style={{ ...s.actionBtn, background: '#fee2e2', color: '#ef4444' }} title="מחק"><Trash2 size={14} /></button>}
                      </td>
                      <td style={{ ...s.td, fontWeight: 900, color: p.status === 'frozen' ? '#94a3b8' : '#334155' }}>
                        {p.fullName}
                        {p.status === 'frozen' && <span style={s.frozenBadge}>מוקפא</span>}
                      </td>
                      <td style={s.td}>{p.idNumber}</td>
                      <td style={{ ...s.td, color: p.status === 'frozen' ? '#94a3b8' : '#dc2626', fontWeight: 'bold' }}>{p.emergencyContact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visiblePatientsCount < filteredPatients.length && (
                <button onClick={() => setVisiblePatientsCount(prev => prev + 50)} style={s.loadMoreBtn}>
                  טען עוד מבוטחים...
                </button>
              )}
            </div>
          </div>

          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><FileText size={16} color="#94a3b8" /> מסמכים משפטיים</h2>
              <button onClick={() => setShowTermsEdit(true)} style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>ערוך מסמכים</button>
            </div>
          </div>

        </div>
      ) : (
        /* ===== DESKTOP ===== */
        <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, padding: '24px 24px 24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ ...s.card, flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '15px', margin: '0 0 5px 0' }}>מבוטחים במערכת</p>
                  <h3 style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a', margin: 0 }}>{stats.totalUsers}</h3>
                </div>
                <div style={{ backgroundColor: '#dbeafe', color: '#2563eb', padding: '15px', borderRadius: '12px' }}><Users size={32} /></div>
              </div>
              <div style={{ ...s.card, flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '15px', margin: '0 0 5px 0' }}>סריקות (24 שעות)</p>
                  <h3 style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a', margin: 0 }}>{stats.scans24h}</h3>
                </div>
                <div style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: '15px', borderRadius: '12px' }}><Activity size={32} /></div>
              </div>
              <div style={{ ...s.card, flex: 1, display: 'flex', alignItems: 'center', padding: '16px' }}>
                <button onClick={exportToCSV} style={{ width: '100%', minHeight: '65px', background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <Download size={24} /> הורד דוח מנהלים (CSV)
                </button>
              </div>
            </div>

            <div style={{ ...s.card, background: 'linear-gradient(to bottom left, #ffffff, #f8fafc)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <PieChart color="#2563eb" /> ניתוח אירועים מרחבי
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>נתונים סטטיסטיים לפי טווח הזמנים הנבחר</p>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>סך סריקות בטווח</p>
                  <h4 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0 }}>{mapStats.totalScans}</h4>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>אירועים שנסגרו</p>
                  <h4 style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', margin: 0 }}>{mapStats.totalResolved}</h4>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>יחס טיפול</p>
                  <h4 style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb', margin: 0 }}>{mapStats.rate}%</h4>
                </div>
                <div style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginBottom: '12px' }}>גוף מטפל</p>
                  {mapStats.authorities.length === 0 ? (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#f1f5f9' }} />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: `conic-gradient(${mapStats.conicString})`, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', width: '100%', alignItems: 'flex-start' }}>
                    {mapStats.authorities.map((a, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', fontWeight: '500' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} /> 
                        <span>{a.name} ({a.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
                  <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>תוצאת סיום</p>
                  <div style={{ display: 'flex', gap: '2px', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                    {mapStats.outcomes.length === 0 ? <div style={{ flex: 1, backgroundColor: '#f1f5f9' }} /> : 
                      mapStats.outcomes.map((o, idx) => (
                        <div key={idx} style={{ flex: o.value, backgroundColor: o.color }} />
                      ))
                    }
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'flex-start' }}>
                    {mapStats.outcomes.map((o, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', fontWeight: '500' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: o.color, flexShrink: 0 }} /> 
                        <span>{o.name} ({o.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={s.card}>
              <MapHeaderControls />
              <div style={{ height: '400px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <MapContainer center={[32.0853, 34.7818]} zoom={8} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  {getMapMarkers().map((item: any) => (
                    <CircleMarker 
                      key={item.id} 
                      center={item.pos} 
                      pathOptions={{ 
                        color: mapViewMode === 'heat' ? 'transparent' : item.statusColor, 
                        fillColor: item.statusColor, 
                        fillOpacity: mapViewMode === 'heat' ? 0.3 : 0.8 
                      }} 
                      radius={mapViewMode === 'heat' ? 25 : (item.isGps ? 8 : 5)}
                    >
                      {mapViewMode === 'pins' && (
                        <Popup>
                          <div style={{ direction: 'rtl', textAlign: 'right' }}>
                            <span style={{ color: '#64748b', fontSize: '12px' }}>מספר צמיד:</span><br/>
                            <strong>{item.braceletId}</strong><br />
                            {item.isGps && <span style={{ color: '#059669', fontSize: '11px', fontWeight: 'bold' }}>📡 GPS מדויק</span>}
                          </div>
                        </Popup>
                      )}
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div style={{ ...s.card, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Users color="#94a3b8" /> מבוטחים ({filteredPatients.length})</h2>
                  <button onClick={() => setShowAddPatient(true)} style={{ padding: '10px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserPlus size={18} /> הוסף מבוטח
                  </button>
                </div>
                <input type="text" placeholder="חיפוש (ת.ז, שם או הקלד 'מוקפא')..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...s.input, width: '250px' }} />
              </div>
              <div style={{ overflowX: 'auto', flexGrow: 1, border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '600px' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={s.th}>פעולות</th>
                      <th style={s.th}>מחוז</th>
                      <th style={s.th}>שם מלא</th>
                      <th style={s.th}>תעודת זהות</th>
                      <th style={s.th}>טלפון אישי</th>
                      <th style={s.th}>איש קשר בחירום</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.slice(0, visiblePatientsCount).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: p.status === 'frozen' ? '#fafafa' : 'transparent', opacity: p.status === 'frozen' ? 0.8 : 1 }}>
                        <td style={s.td}>
                          <button onClick={() => { setEditingPatient(p); setEditForm({ fullName: p.fullName, idNumber: p.idNumber, braceletId: p.braceletId, district: formatDistrict(p.district), city: p.city, phone: p.personalPhone, emergencyContact: p.emergencyContact, history: p.medicalHistory }); }} style={{ ...s.actionBtn, background: '#f1f5f9', color: '#475569' }} title="ערוך"><Edit2 size={16} /></button>
                          <button onClick={() => toggleFreezeStatus(p.id, p.status || 'active')} style={{ ...s.actionBtn, background: p.status === 'frozen' ? '#dcfce3' : '#fef08a', color: p.status === 'frozen' ? '#166534' : '#854d0e' }} title={p.status === 'frozen' ? 'הפעל מחדש' : 'הקפא צמיד'}>
                            {p.status === 'frozen' ? <Play size={16} /> : <Pause size={16} />}
                          </button>
                          {accessLevel === 'master' && <button onClick={() => handleDeletePatient(p.id)} style={{ ...s.actionBtn, background: '#fee2e2', color: '#ef4444' }} title="מחק"><Trash2 size={16} /></button>}
                        </td>
                        <td style={s.td}><span style={s.badge}>{formatDistrict(p.district)}</span></td>
                        <td style={{ ...s.td, fontWeight: 900, color: p.status === 'frozen' ? '#94a3b8' : '#334155' }}>
                          {p.fullName}
                          {p.status === 'frozen' && <span style={s.frozenBadge}>מוקפא</span>}
                        </td>
                        <td style={s.td}>{p.idNumber}</td>
                        <td style={s.td}>{p.personalPhone}</td>
                        <td style={{ ...s.td, color: p.status === 'frozen' ? '#94a3b8' : '#dc2626', fontWeight: 'bold' }}>{p.emergencyContact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visiblePatientsCount < filteredPatients.length && (
                  <button onClick={() => setVisiblePatientsCount(prev => prev + 50)} style={s.loadMoreBtn}>
                    טען עוד מבוטחים...
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ width: '280px', flexShrink: 0, padding: '24px 16px 24px 24px', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box' }}>
            <div style={{ ...s.card, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', margin: '0 0 20px 0' }}>📡 סריקות אחרונות</h2>
              <div style={{ overflowY: 'auto', flexGrow: 1, marginBottom: '20px' }}>
                {scanFeed.length === 0
                  ? <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>אין סריקות לאחרונה</p>
                  : scanFeed.slice(0, visibleFeedCount).map(log => {
                    const status = getEventStatus(log, logs);
                    return (
                      <div key={log.id} style={{ ...s.feedItem, borderRightColor: status.color }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#334155' }}>{log.action === 'SCAN' ? '✅ סריקה נכנסה' : '⚠️ שגיאה'}</span>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: status.color }} title={status.label}></div>
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px 0' }}>{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('he-IL') : '---'}</p>
                        <p style={{ fontWeight: 900, color: '#2563eb', margin: 0, fontSize: '14px' }}>צמיד: {log.details}</p>
                      </div>
                    );
                  })
                }
                {visibleFeedCount < scanFeed.length && (
                  <button onClick={() => setVisibleFeedCount(prev => prev + 50)} style={s.loadMoreBtn}>
                    טען עוד...
                  </button>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Building2 size={16} color="#94a3b8" /> רשויות</h2>
                  <button onClick={() => setShowAddAuth(!showAddAuth)} style={{ padding: '6px 10px', backgroundColor: '#1e293b', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '12px' }}>
                    <Plus size={14} /> הוסף
                  </button>
                </div>
                {showAddAuth && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <input type="text" value={newAuth.name} placeholder="שם רשות" onChange={e => setNewAuth({ ...newAuth, name: e.target.value })} style={{...s.input, padding: '8px', marginBottom: '8px', fontSize: '12px'}} />
                    <input type="text" value={newAuth.code} placeholder="קוד פתיחה" onChange={e => setNewAuth({ ...newAuth, code: e.target.value })} style={{...s.input, padding: '8px', marginBottom: '8px', fontSize: '12px'}} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setShowAddAuth(false)} style={{...s.btnSecondary, padding: '8px', marginTop: 0}}>ביטול</button>
                      <button onClick={handleAddAuthority} style={{...s.btnPrimary, padding: '8px', marginTop: 0}}>שמור</button>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  {authorities.map(auth => (
                    <div key={auth.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 900, fontSize: '14px', margin: '0 0 2px 0', color: '#1e293b' }}>{auth.name}</p>
                        <span style={{ backgroundColor: '#dbeafe', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>קוד: {auth.code}</span>
                      </div>
                      <button onClick={() => handleDeleteAuthority(auth.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><FileText size={16} color="#94a3b8" /> מסמכים משפטיים</h2>
                  <button onClick={() => setShowTermsEdit(true)} style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>ערוך מסמכים</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showAddPatient && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontSize: '22px', fontWeight: 900, textAlign: 'center', margin: '0 0 20px 0' }}>הוספת מבוטח חדש</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={s.rowInputs}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>שם מלא *</label><input type="text" value={newPatientForm.fullName} onChange={e => setNewPatientForm({ ...newPatientForm, fullName: e.target.value })} style={s.input} /></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>תעודת זהות *</label><input type="text" value={newPatientForm.idNumber} onChange={e => setNewPatientForm({ ...newPatientForm, idNumber: e.target.value })} style={s.input} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מספר צמיד (NFC ID) *</label><input type="text" value={newPatientForm.braceletId} onChange={e => setNewPatientForm({ ...newPatientForm, braceletId: e.target.value })} style={s.input} /></div>
              <div style={s.rowInputs}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מחוז</label><select value={newPatientForm.district} onChange={e => setNewPatientForm({ ...newPatientForm, district: e.target.value })} style={s.input}><option value="מרכז">מרכז</option><option value="צפון">צפון</option><option value="דרום">דרום</option></select></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>עיר</label><input type="text" value={newPatientForm.city} onChange={e => setNewPatientForm({ ...newPatientForm, city: e.target.value })} style={s.input} /></div>
              </div>
              <div style={s.rowInputs}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>טלפון נייד</label><input type="text" value={newPatientForm.phone} onChange={e => setNewPatientForm({ ...newPatientForm, phone: e.target.value })} style={s.input} /></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#dc2626', marginBottom: '5px' }}>איש קשר לחירום *</label><input type="text" value={newPatientForm.emergencyContact} onChange={e => setNewPatientForm({ ...newPatientForm, emergencyContact: e.target.value })} style={{ ...s.input, borderColor: '#fca5a5', backgroundColor: '#fef2f2' }} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מידע רפואי קריטי</label><textarea value={newPatientForm.history} onChange={e => setNewPatientForm({ ...newPatientForm, history: e.target.value })} rows={3} style={{ ...s.input, resize: 'none' }} placeholder="רגישויות, מחלות רקע..." /></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowAddPatient(false)} style={s.btnSecondary}>ביטול</button>
              <button onClick={handleAddPatient} style={s.btnPrimary}>הוסף מבוטח</button>
            </div>
          </div>
        </div>
      )}

      {editingPatient && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontSize: '22px', fontWeight: 900, textAlign: 'center', margin: '0 0 20px 0' }}>עריכת מבוטח</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={s.rowInputs}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>שם מלא</label><input type="text" value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} style={s.input} /></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>תעודת זהות</label><input type="text" value={editForm.idNumber} onChange={e => setEditForm({ ...editForm, idNumber: e.target.value })} style={s.input} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מספר צמיד</label><input type="text" value={editForm.braceletId} disabled style={s.input} /></div>
              <div style={s.rowInputs}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מחוז</label><select value={editForm.district} onChange={e => setEditForm({ ...editForm, district: e.target.value })} style={s.input}><option value="מרכז">מרכז</option><option value="צפון">צפון</option><option value="דרום">דרום</option></select></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>עיר</label><input type="text" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} style={s.input} /></div>
              </div>
              <div style={s.rowInputs}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>טלפון נייד</label><input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={s.input} /></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#dc2626', marginBottom: '5px' }}>איש קשר לחירום</label><input type="text" value={editForm.emergencyContact} onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })} style={{ ...s.input, borderColor: '#fca5a5', backgroundColor: '#fef2f2' }} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>מידע רפואי</label><textarea value={editForm.history} onChange={e => setEditForm({ ...editForm, history: e.target.value })} rows={3} style={{ ...s.input, resize: 'none' }} /></div>
              
              <div style={{ marginTop: '5px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button 
                  onClick={(e) => { e.preventDefault(); setConsentModalData(editingPatient); }} 
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', width: '100%', justifyContent: 'center' }}
                >
                  📄 צפה באישורים משפטיים
                </button>
              </div>

            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setEditingPatient(null)} style={s.btnSecondary}>ביטול</button>
              <button onClick={saveEdit} style={s.btnPrimary}>שמור שינויים</button>
            </div>
          </div>
        </div>
      )}

      {/* מודל הצגת נתוני הסכמה משפטית של המבוטח */}
      {consentModalData && (
        <div style={{...s.overlay, zIndex: 1100}}>
          <div style={{...s.modal, maxWidth: '400px'}}>
            <h3 style={{ fontSize: '20px', fontWeight: 900, textAlign: 'center', margin: '0 0 20px 0', color: '#0f172a' }}>אישורים משפטיים</h3>
            {consentModalData.legalConsent ? (
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#334155', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>אישור תנאי שימוש:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>✅ אושר</span></p>
                <p style={{ margin: '0 0 8px 0' }}><strong>אישור מדיניות פרטיות:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>✅ אושר</span></p>
                <p style={{ margin: '0 0 8px 0' }}><strong>תאריך חתימה:</strong><br/>{consentModalData.legalConsent.timestamp?.toDate ? consentModalData.legalConsent.timestamp.toDate().toLocaleString('he-IL') : 'לא זמין'}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>כתובת IP:</strong><br/>{consentModalData.legalConsent.ipAddress || 'לא זמין'}</p>
                <p style={{ margin: 0, wordBreak: 'break-word' }}><strong>מכשיר/דפדפן:</strong><br/>{consentModalData.legalConsent.userAgent || 'לא זמין'}</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: 'bold', padding: '20px 0', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                ⚠️ המבוטח טרם אישר את מסמכי המערכת.
              </div>
            )}
            <button onClick={() => setConsentModalData(null)} style={{...s.btnSecondary, marginTop: '20px'}}>סגור</button>
          </div>
        </div>
      )}

      {/* מודל עריכת מסמכים משפטיים */}
      {showTermsEdit && (
        <div style={s.overlay}>
          <div style={{...s.modal, maxWidth: '700px'}}>
            <h3 style={{ fontSize: '22px', fontWeight: 900, textAlign: 'center', margin: '0 0 20px 0', color: '#0f172a' }}>עריכת מסמכים משפטיים</h3>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '6px', borderRadius: '12px' }}>
              <button onClick={() => setLegalEditTab('terms')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: legalEditTab === 'terms' ? 'white' : 'transparent', color: legalEditTab === 'terms' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer', boxShadow: legalEditTab === 'terms' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>תנאי שימוש</button>
              <button onClick={() => setLegalEditTab('privacy')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: legalEditTab === 'privacy' ? 'white' : 'transparent', color: legalEditTab === 'privacy' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer', boxShadow: legalEditTab === 'privacy' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>מדיניות פרטיות</button>
            </div>

            {legalEditTab === 'terms' ? (
              <textarea 
                value={termsText} 
                onChange={(e) => setTermsText(e.target.value)} 
                placeholder="הכנס את תנאי השימוש כאן..."
                style={{...s.input, height: '350px', resize: 'vertical', fontFamily: 'system-ui', direction: 'rtl', lineHeight: '1.6'}} 
              />
            ) : (
              <textarea 
                value={privacyText} 
                onChange={(e) => setPrivacyText(e.target.value)} 
                placeholder="הכנס את מדיניות הפרטיות כאן..."
                style={{...s.input, height: '350px', resize: 'vertical', fontFamily: 'system-ui', direction: 'rtl', lineHeight: '1.6'}} 
              />
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowTermsEdit(false)} style={s.btnSecondary}>ביטול</button>
              <button onClick={handleSaveTerms} disabled={isSavingTerms} style={s.btnPrimary}>{isSavingTerms ? 'שומר...' : 'שמור מסמכים'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;