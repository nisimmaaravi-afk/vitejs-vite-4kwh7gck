import { useEffect, useState } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  Phone, Heart, VolumeX, Hand, PersonStanding,
  Moon, AlertTriangle, X, CheckCircle, Shield
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
  const [isCheckingCode, setIsCheckingCode] = useState(false); // סטייט לטעינה בזמן בדיקת קוד
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  
  // הסטייט הקריטי ששומר מי הגוף שטיפל באירוע
  const [handlerOrg, setHandlerOrg] = useState<string>('אזרח / לא ידוע');

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
          console.error("Patient not found");
        }
      } catch (error) {
        console.error("Error fetching patient data", error);
      }
    };
    fetchPatient();
  }, [tagId]);

  useEffect(() => {
    if (reportSubmitted) {
      const timer = setTimeout(() => {
        window.location.replace('https://www.google.com');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [reportSubmitted]);

  // פונקציה חכמה לאימות הקוד מול Firebase רק בזמן לחיצה
  const verifyMedicalCode = async () => {
    if (!medicalCode) return;
    setIsCheckingCode(true);
    setCodeError(false);

    // 1. קודם בודקים אם זה המאסטר שלנו
    if (medicalCode === MASTER_CODE) {
      setMedicalUnlocked(true);
      setHandlerOrg('Master Admin');
      setIsCheckingCode(false);
      return;
    }

    try {
      // 2. חיפוש דינמי ב-Firebase מול הרשויות שהקמת באדמין
      const orgsRef = collection(db, 'organizations');
      const q = query(orgsRef, where('code', '==', medicalCode));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // מצאנו התאמה ברשויות!
        const orgData = querySnapshot.docs[0].data();
        setMedicalUnlocked(true);
        setHandlerOrg(orgData.name); // שומר את שם הגוף המטפל
      } else {
        // 3. Fallback לבדיקה - אם לא הוקם ב-DB, נבדוק את הקודים הסטטיים שביקשת
        if (medicalCode === '1000') {
          setMedicalUnlocked(true);
          setHandlerOrg('משטרה (בדיקה)');
        } else if (medicalCode === '1001') {
          setMedicalUnlocked(true);
          setHandlerOrg('מד"א (בדיקה)');
        } else {
          // שום דבר לא תאם
          setCodeError(true);
        }
      }
    } catch (error) {
      console.error("Error verifying code with DB", error);
      setCodeError(true);
    } finally {
      setIsCheckingCode(false);
    }
  };

  const submitReport = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(false);
    try {
      if (!tagId) throw new Error('Missing critical data');

      const dbAction = eventType === 'test' ? 'SYSTEM_TEST' : 'EVENT_RESOLVED';
      const dbOutcome = eventType === 'test' ? 'test_successful' : reportData.outcome;

      await addDoc(collection(db, 'system_logs'), {
        action: dbAction,
        details: tagId,
        outcome: dbOutcome,
        notes: reportData.notes || '',
        freeText: eventType === 'test' ? 'בדיקת תקינות יזומה' : (reportData.freeText?.trim() || ''),
        timestamp: serverTimestamp(),
        user: handlerOrg, // <--- כאן נשתל השם של הרשות!
        appVersion: '2.0.0-PRO',
      });
      setReportSubmitted(true);
    } catch (e) {
      console.error('Critical: Error submitting report', e);
      setSubmitError(true);
      setIsSubmitting(false);
    }
  };

  if (!patient) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', background: '#F0F4F8', color: '#0f172a', fontWeight: 700 }}>
      טוען נתונים מאובטחים...
    </div>
  );

  const firstName = getFirstName(patient.fullName || patient.firstName || '');

  if (reportSubmitted) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F0F4F8', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '24px',
        textAlign: 'center', direction: 'rtl', fontFamily: "'Segoe UI', system-ui, sans-serif"
      }}>
        <div style={{ background: 'white', padding: '48px', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', maxWidth: '480px', width: '100%' }}>
          <CheckCircle size={72} color={eventType === 'test' ? "#3b82f6" : "#22c55e"} style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>
            {eventType === 'test' ? 'הבדיקה עברה בהצלחה' : 'תודה רבה!'}
          </h2>
          <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '28px', lineHeight: 1.6 }}>
            {eventType === 'test' 
              ? `המערכת תקינה. הנתונים נשמרו בלוג המערכת תחת הגוף: ${handlerOrg}`
              : <><strong style={{ color: '#0f172a' }}>{firstName}</strong> מודה לך מקרב לב על העזרה. האירוע נסגר בבטחה על ידי {handlerOrg}.</>}
          </p>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginBottom: '28px' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155', fontStyle: 'italic', lineHeight: 1.6 }}>
              "הצמיד הזה הוא לא רק סמל – הוא הצהרה שכולנו ראויים להכרה, לכבוד ולתמיכה. יחד, אנחנו יכולים לשנות את הדרך שבה החברה שלנו מתייחסת למתמודדים עם פוסט-טראומה."
            </p>
          </div>
          <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ background: eventType === 'test' ? '#3b82f6' : '#22c55e', height: '100%', animation: 'progress 15s linear forwards', transformOrigin: 'left' }} />
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>מנקה נתונים ויוצא בעוד 15 שניות...</p>
        </div>
        <style>{`@keyframes progress { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: '#0f172a', paddingBottom: '40px' }}>
      <header style={{
        background: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '16px', letterSpacing: '-0.5px' }}>
          <Shield color="#2563eb" size={22} />
          <span>Recognition Live <span style={{ color: '#2563eb' }}>חירום</span></span>
        </div>
        <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
          ● מצב חירום פעיל
        </span>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
          פרופיל חירום: {patient.fullName}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'stretch' }}>
          <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#cbd5e1', position: 'relative', minHeight: '160px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            {patient.photoURL ? (
              <img src={patient.photoURL} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700 }}>תמונה</div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 12px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}>
              <p style={{ color: 'white', fontSize: '16px', fontWeight: 900, margin: 0 }}>{patient.fullName}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '2px' }}>נושא צמיד PTSD</p>
            </div>
          </div>

          <a href={`tel:${patient.emergencyPhone}`} style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            borderRadius: '16px', padding: '20px 24px', color: 'white',
            textDecoration: 'none', boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                איש קשר לחירום
              </p>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={26} />
              </div>
            </div>
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '16px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px', letterSpacing: '0.5px' }}>
              חייג בעת צרה
            </div>
          </a>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#2563eb' }}>
            <Heart size={18} fill="#2563eb" color="#2563eb" />
            פעל על פי פרוטוקול הכרה
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { icon: VolumeX, t: 'דברו איתי בשקט', d: 'שמרו על קול נמוך ורגוע.' },
              { icon: Hand, t: 'אל תגעו בי', d: 'מגע פיזי עלול לגרום לתגובה.' },
              { icon: PersonStanding, t: 'תנו לי מרחב של 1.5 מטר', d: 'שמרו על מרחק אלא אם יש סכנה מידית.' },
              { icon: Moon, t: 'עברו לאזור שקט', d: 'עצור התקהלות של אנשים מסביב.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '12px', alignItems: 'flex-start' }}>
                <item.icon color="#3b82f6" size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', margin: '0 0 2px' }}>{item.t}</p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle color="#f97316" size={18} style={{ flexShrink: 0 }} />
            <p style={{ fontWeight: 800, fontSize: '13px', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              ⚠ מידע רפואי קריטי — מסווג
            </p>
          </div>
          {!medicalUnlocked ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 8px 0 0', flexShrink: 0 }}>הזן קוד גישה:</p>
              <input
                type="password"
                value={medicalCode}
                onChange={(e) => { setMedicalCode(e.target.value); setCodeError(false); }}
                placeholder="••••"
                maxLength={8}
                style={{ width: '100px', padding: '8px 12px', borderRadius: '10px', border: codeError ? '2px solid #ef4444' : '2px solid #e2e8f0', fontSize: '18px', outline: 'none', textAlign: 'center', letterSpacing: '2px', direction: 'ltr' }}
              />
              <button
                onClick={verifyMedicalCode}
                disabled={isCheckingCode}
                style={{ padding: '8px 16px', background: isCheckingCode ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: isCheckingCode ? 'wait' : 'pointer' }}
              >
                {isCheckingCode ? 'בודק...' : 'אשר'}
              </button>
              {codeError && <p style={{ color: '#ef4444', fontSize: '11px', margin: 0, width: '100%' }}>קוד לא מזוהה במערכת</p>}
            </div>
          ) : (
            <div style={{ background: '#fff7ed', borderRadius: '12px', padding: '12px 16px', border: '1px solid #fed7aa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #fdba74', paddingBottom: '8px' }}>
                 <p style={{ fontSize: '11px', color: '#c2410c', fontWeight: 800, margin: 0 }}>מידע פתוח לגורם מורשה:</p>
                 <span style={{ fontSize: '11px', background: '#ffedd5', padding: '2px 8px', borderRadius: '10px', color: '#9a3412', fontWeight: 700 }}>{handlerOrg}</span>
              </div>
              <p style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, margin: 0, lineHeight: 1.6 }}>
                {patient.notes || 'לא סופק מידע קריטי.'}
              </p>
            </div>
          )}
        </div>

        <button onClick={() => setShowReportForm(true)} style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
          ✅ סמן אירוע כסגור / בדיקת תקינות
        </button>

      </main>

      <footer style={{ marginTop: '24px', padding: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', background: 'white' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155', fontStyle: 'italic', marginBottom: '16px', direction: 'rtl' }}>
          "פוסט טראומה היא תווית שלא מבקשים, אבל הכרה היא תווית שכולנו ראויים לה."
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span>מדיניות פרטיות</span>
          <span>תנאי שימוש</span>
          <span>© 2026 Recognition Live Systems</span>
        </div>
      </footer>

      {showReportForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px', direction: 'rtl' }}>
          <div style={{ background: 'white', borderRadius: '28px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 80px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => setShowReportForm(false)} style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={22} />
            </button>
            
            <h3 style={{ fontWeight: 900, fontSize: '22px', textAlign: 'center', marginBottom: '20px', color: '#0f172a' }}>סיום פעולה</h3>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '6px', borderRadius: '16px' }}>
              <button
                onClick={() => setEventType('real')}
                style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: eventType === 'real' ? 'white' : 'transparent', color: eventType === 'real' ? '#ef4444' : '#64748b', fontWeight: 800, fontSize: '14px', boxShadow: eventType === 'real' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🚨 אירוע אמת
              </button>
              <button
                onClick={() => setEventType('test')}
                style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: eventType === 'test' ? 'white' : 'transparent', color: eventType === 'test' ? '#3b82f6' : '#64748b', fontWeight: 800, fontSize: '14px', boxShadow: eventType === 'test' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🔧 בדיקת מערכת
              </button>
            </div>

            {eventType === 'real' ? (
              <>
                <label style={{ fontWeight: 700, display: 'block', marginBottom: '8px', color: '#334155', fontSize: '13px' }}>כיצד הסתיים האירוע?</label>
                <select
                  value={reportData.outcome}
                  onChange={(e) => { const val = e.target.value; setReportData(prev => ({ ...prev, outcome: val })); }}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', marginBottom: '16px', fontSize: '16px', background: '#f8fafc', outline: 'none', color: '#0f172a' }}
                >
                  <option value="calmed_down">✅ הרגעה במקום</option>
                  <option value="family_arrived">👨‍👩‍👧‍👦 הגעת בן משפחה</option>
                  <option value="ambulance">🚑 פינוי באמבולנס</option>
                  <option value="police">🚓 גורמי ביטחון</option>
                  <option value="refused_help">❌ סירב לקבל עזרה</option>
                </select>
                <label style={{ fontWeight: 700, display: 'block', marginBottom: '8px', color: '#334155', fontSize: '13px' }}>תיאור חופשי (אופציונלי)</label>
                <textarea
                  value={reportData.freeText}
                  onChange={(e) => { const val = e.target.value; setReportData(prev => ({ ...prev, freeText: val })); }}
                  placeholder="תאר את האירוע, פעולות שננקטו, הערות נוספות..."
                  rows={3}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', marginBottom: '24px', fontSize: '14px', background: '#f8fafc', outline: 'none', color: '#0f172a', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
              </>
            ) : (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
                <p style={{ color: '#1e3a8a', fontSize: '14px', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                  סריקה זו תתועד כבדיקת תקינות מערכתית בלבד ולא תיחשב כאירוע חירום בסטטיסטיקות הרשמיות.
                </p>
              </div>
            )}

            {submitError && (
              <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '12px', fontWeight: 600 }}>
                ⚠ שגיאה בשליחה, אנא נסה שנית
              </p>
            )}
            
            <button 
              onClick={submitReport} 
              disabled={isSubmitting} 
              style={{ 
                width: '100%', padding: '18px', 
                background: isSubmitting ? '#94a3b8' : (eventType === 'test' ? '#3b82f6' : '#22c55e'), 
                color: 'white', border: 'none', borderRadius: '18px', fontWeight: 900, fontSize: '18px', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer', 
                boxShadow: eventType === 'test' ? '0 8px 24px rgba(59,130,246,0.3)' : '0 8px 24px rgba(34,197,94,0.3)', 
                transition: 'background 0.2s' 
              }}>
              {isSubmitting ? 'שולח...' : (eventType === 'test' ? 'סיים בדיקה' : 'שלח וסיים אירוע')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}