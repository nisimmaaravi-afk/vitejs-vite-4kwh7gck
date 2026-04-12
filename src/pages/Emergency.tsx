import { useEffect, useState } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  Phone, Heart, VolumeX, Hand, PersonStanding,
  Moon, AlertTriangle, X, CheckCircle, Shield, Info, HeadphonesIcon, Eye
} from 'lucide-react';

interface PatientData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  emergencyPhone?: string;
  idNumber?: string;
  city?: string;
  photoURL?: string;
  notes?: string;
  status?: string;
}

export default function Emergency({ tagId }: { tagId: string }) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [eventType, setEventType] = useState<'real' | 'test'>('real');
  const [reportData, setReportData] = useState({ outcome: 'calmed_down', notes: '', freeText: '' });
  
  const [medicalCode, setMedicalCode] = useState('');
  const [medicalUnlocked, setMedicalUnlocked] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  const [handlerOrg, setHandlerOrg] = useState<string>('אזרח / לא ידוע');
  const [countdown, setCountdown] = useState(10); 

  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  const [legalTexts, setLegalTexts] = useState({ terms: 'טוען...', privacy: 'טוען...' });

  const MASTER_CODE = '65942229';

  const getFirstName = (name: string): string => {
    if (!name) return 'המטופל';
    return name.trim().split(' ')[0];
  };

  useEffect(() => {
    const fetchPatient = async () => {
      if (!tagId) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', tagId));
        if (docSnap.exists()) {
          setPatient(docSnap.data() as PatientData);
          window.history.replaceState(null, '', '/active-emergency-session');
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error fetching patient data", error);
        setNotFound(true);
      }
    };
    fetchPatient();
  }, [tagId]);

  useEffect(() => {
    const fetchLegalDocs = async () => {
      try {
        const termsSnap = await getDoc(doc(db, 'settings', 'terms'));
        setLegalTexts(prev => ({ ...prev, terms: termsSnap.exists() ? termsSnap.data().text : 'תקנון טרם הוזן.' }));
        const privacySnap = await getDoc(doc(db, 'settings', 'privacy'));
        setLegalTexts(prev => ({ ...prev, privacy: privacySnap.exists() ? privacySnap.data().text : 'פרטיות טרם הוזנה.' }));
      } catch (err) {
        console.error('Error fetching legal docs:', err);
      }
    };
    fetchLegalDocs();
  }, []);

  useEffect(() => {
    if (reportSubmitted) {
      const timer = setTimeout(() => window.location.replace('https://www.google.com'), 15000);
      return () => clearTimeout(timer);
    }
  }, [reportSubmitted]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (notFound || patient?.status === 'frozen') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      } else {
        window.location.replace('https://www.google.com');
      }
    }
    return () => clearTimeout(timer);
  }, [notFound, patient?.status, countdown]);

  const verifyMedicalCode = async () => {
    if (!medicalCode) return;
    setIsCheckingCode(true);
    setCodeError(false);
    if (medicalCode === MASTER_CODE) {
      setMedicalUnlocked(true);
      setHandlerOrg('Master Admin');
      setIsCheckingCode(false);
      return;
    }
    try {
      const q = query(collection(db, 'authorities'), where('code', '==', medicalCode));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setMedicalUnlocked(true);
        setHandlerOrg(querySnapshot.docs[0].data().name);
      } else if (medicalCode === '1000' || medicalCode === '1001') {
        setMedicalUnlocked(true);
        setHandlerOrg(medicalCode === '1000' ? 'משטרת ישראל (בדיקה)' : 'מד"א (בדיקה)');
      } else {
        setCodeError(true);
      }
    } catch (error) {
      setCodeError(true);
    } finally {
      setIsCheckingCode(false);
    }
  };

  const submitReport = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const dbOutcome = eventType === 'test' ? 'test_successful' : reportData.outcome;
      await addDoc(collection(db, 'system_logs'), {
        action: 'EVENT_RESOLVED', 
        eventType, 
        details: tagId,
        outcome: dbOutcome,
        timestamp: serverTimestamp(),
        authority: handlerOrg,
        appVersion: '2.2.1-PRO',
      });
      setReportSubmitted(true);
    } catch (e) {
      setSubmitError(true);
      setIsSubmitting(false);
    }
  };

  if (!patient && !notFound) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>טוען נתונים...</div>;

  if (notFound || patient?.status === 'frozen') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', direction: 'rtl', padding: '20px' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.06)', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <Shield color="#2563eb" size={48} style={{ marginBottom: '20px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 900 }}>Recognition Live</h1>
          <p style={{ color: '#64748b', margin: '20px 0' }}>צמיד לא פעיל או שאינו רשום במערכת.</p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>המסך ייסגר בעוד {countdown} שניות</p>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  if (reportSubmitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', textAlign: 'center' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', maxWidth: '480px' }}>
          <CheckCircle size={64} color="#22c55e" />
          <h2 style={{ fontSize: '24px', fontWeight: 900, marginTop: '20px' }}>דיווח הושלם בהצלחה</h2>
          <p style={{ color: '#64748b', marginTop: '10px' }}>תודה על הסיוע ל{getFirstName(patient.fullName || '')}.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: 'sans-serif', direction: 'rtl', paddingBottom: '40px' }}>
      <header style={{ background: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', sticky: 'top', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
          <Shield color="#2563eb" size={22} />
          <span>Recognition Live <span style={{ color: '#2563eb' }}>חירום</span></span>
        </div>
        <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px' }}>
          ● אני חווה רגע של מצוקה בבקשה עזרו לי לפי ההנחיות
        </span>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900 }}>פרופיל חירום: {patient.fullName}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#cbd5e1', height: '180px' }}>
            {patient.photoURL && <img src={patient.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <a href={`tel:${patient.emergencyPhone}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#2563eb', borderRadius: '16px', color: 'white', textDecoration: 'none', textAlign: 'center', padding: '20px' }}>
            <Phone size={32} style={{ margin: '0 auto 10px' }} />
            <span style={{ fontWeight: 900, fontSize: '14px' }}>הם יודעים איך לעזור לי</span>
          </a>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 800, fontSize: '15px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Heart size={18} fill="#2563eb" /> פרוטוקול הכרה
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { icon: VolumeX, t: 'דברו איתי בשקט', d: 'שמרו על קול נמוך ורגוע.' },
              { icon: Hand, t: 'אל תגעו בי', d: 'מגע פיזי עלול לגרום לתגובה.' },
              { icon: PersonStanding, t: 'שמרו מרחק של 2 צעדים', d: 'שמרו על מרחק בטיחות.' },
              { icon: Moon, t: 'עזרו לי להגיע למקום שקט', d: 'עצרו התקהלות סביבי.' },
              { 
                icon: Eye, 
                t: 'עזרו לי לחזור לכאן ועכשיו', 
                d: 'בקשו ממני לתאר לאט:\n• 5 דברים שאני רואה\n• 4 דברים שאני מרגיש\n• 3 צלילים סביבי', 
                full: true 
              }
            ].map((item, i) => (
              <div key={i} style={{ 
                display: 'flex', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '12px', 
                gridColumn: item.full ? 'span 2' : 'auto' 
              }}>
                <item.icon color="#3b82f6" size={18} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>{item.t}</p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px' }}>
          <p style={{ fontWeight: 800, fontSize: '13px', color: '#c2410c', marginBottom: '10px' }}>⚠ מידע רפואי מסווג</p>
          {!medicalUnlocked ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="password" value={medicalCode} onChange={(e) => setMedicalCode(e.target.value)} placeholder="קוד גישה" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
              <button onClick={verifyMedicalCode} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700 }}>אישור</button>
            </div>
          ) : (
            <p style={{ fontSize: '14px', lineHeight: 1.6 }}>{patient.notes || 'אין מידע נוסף.'}</p>
          )}
        </div>

        <button onClick={() => setShowReportForm(true)} style={{ width: '100%', background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}>
          ✅ סיום אירוע / בדיקת תקינות
        </button>
      </main>

      {showReportForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ textAlign: 'center', fontWeight: 900, marginBottom: '20px' }}>סיום פעולה</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button onClick={() => setEventType('real')} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: eventType === 'real' ? '#ef4444' : '#f1f5f9', color: eventType === 'real' ? 'white' : '#64748b', border: 'none', fontWeight: 800 }}>🚨 אמת</button>
              <button onClick={() => setEventType('test')} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: eventType === 'test' ? '#3b82f6' : '#f1f5f9', color: eventType === 'test' ? 'white' : '#64748b', border: 'none', fontWeight: 800 }}>🔧 בדיקה</button>
            </div>
            <button onClick={submitReport} disabled={isSubmitting} style={{ width: '100%', padding: '18px', background: '#22c55e', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 900 }}>שלח וסיים</button>
          </div>
        </div>
      )}
    </div>
  );
}