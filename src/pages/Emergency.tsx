import { useEffect, useState } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
  const [reportData, setReportData] = useState({ outcome: 'calmed_down', notes: '', freeText: '' });
  const [medicalCode, setMedicalCode] = useState('');
  const [medicalUnlocked, setMedicalUnlocked] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const MEDICAL_CODE = '1010';

  const getFirstName = (name: string): string => {
    if (!name) return 'המטופל';
    return name.trim().split(' ')[0];
  };

  useEffect(() => {
    const fetchPatient = async () => {
      if (!tagId) return;
      const docSnap = await getDoc(doc(db, 'users', tagId));
      if (docSnap.exists()) setPatient(docSnap.data() as PatientData);
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

  const submitReport = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(false);
    try {
      if (!tagId || !reportData.outcome) {
        throw new Error('Missing critical data');
      }
      console.log('Submitting report:', JSON.stringify(reportData));
      await addDoc(collection(db, 'system_logs'), {
        action: 'EVENT_RESOLVED',
        details: tagId,
        outcome: reportData.outcome,
        notes: reportData.notes || '',
        freeText: reportData.freeText?.trim() || '',
        timestamp: serverTimestamp(),
        user: 'Scanner',
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
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      טוען נתונים...
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
          <CheckCircle size={72} color="#22c55e" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>תודה רבה!</h2>
          <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '28px', lineHeight: 1.6 }}>
            <strong style={{ color: '#0f172a' }}>{firstName}</strong> מודה לך מקרב לב על העזרה. האירוע נסגר בבטחה.
          </p>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginBottom: '28px' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155', fontStyle: 'italic', lineHeight: 1.6 }}>
              "פוסט טראומה היא תווית שלא מבקשים, אבל הכרה היא תווית שכולנו ראויים לה."
            </p>
          </div>
          <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ background: '#22c55e', height: '100%', animation: 'progress 15s linear forwards', transformOrigin: 'left' }} />
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>מנקה נתונים ויוצא בעוד 15 שניות...</p>
        </div>
        <style>{`@keyframes progress { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: '#0f172a', paddingBottom: '40px' }}>

      {/* Header */}
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

        {/* שורה עליונה: תמונה + כפתור חיוג */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'stretch' }}>

          {/* תמונה */}
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

          {/* כפתור חיוג */}
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

        {/* פרוטוקול הכרה */}
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

        {/* מידע רפואי קריטי */}
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
                maxLength={6}
                style={{ width: '100px', padding: '8px 12px', borderRadius: '10px', border: codeError ? '2px solid #ef4444' : '2px solid #e2e8f0', fontSize: '18px', outline: 'none', textAlign: 'center', letterSpacing: '6px', direction: 'ltr' }}
              />
              <button
                onClick={() => { if (medicalCode === MEDICAL_CODE) { setMedicalUnlocked(true); setCodeError(false); } else { setCodeError(true); } }}
                style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >אשר</button>
              {codeError && <p style={{ color: '#ef4444', fontSize: '11px', margin: 0 }}>קוד שגוי</p>}
            </div>
          ) : (
            <div style={{ background: '#fff7ed', borderRadius: '12px', padding: '12px 16px', border: '1px solid #fed7aa' }}>
              <p style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, margin: 0, lineHeight: 1.6 }}>
                {patient.notes || 'לא סופק מידע קריטי.'}
              </p>
            </div>
          )}
        </div>

        {/* כפתור סגירת אירוע */}
        <button onClick={() => setShowReportForm(true)} style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
          ✅ סמן אירוע כסגור / סיום אירוע
        </button>

      </main>

      {/* Footer */}
      <footer style={{ marginTop: '24px', padding: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', background: 'white' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155', fontStyle: 'italic', marginBottom: '16px', direction: 'rtl' }}>
          "הצמיד הזה הוא לא רק סמל – הוא הצהרה שכולנו ראויים להכרה, לכבוד ולתמיכה. יחד, אנחנו יכולים לשנות את הדרך שבה החברה שלנו מתייחסת למתמודדים עם פוסט-טראומה."
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span>מדיניות פרטיות</span>
          <span>תנאי שימוש</span>
          <span>© 2026 Recognition Live Systems</span>
        </div>
      </footer>

      {/* מודל סיום אירוע */}
      {showReportForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px', direction: 'rtl' }}>
          <div style={{ background: 'white', borderRadius: '28px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 80px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => setShowReportForm(false)} style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={22} />
            </button>
            <h3 style={{ fontWeight: 900, fontSize: '22px', textAlign: 'center', marginBottom: '24px', color: '#0f172a' }}>סיום אירוע</h3>
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
              onInput={(e) => { const val = (e.target as HTMLTextAreaElement).value; setReportData(prev => ({ ...prev, freeText: val })); }}
              placeholder="תאר את האירוע, פעולות שננקטו, הערות נוספות..."
              rows={4}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', marginBottom: '24px', fontSize: '14px', background: '#f8fafc', outline: 'none', color: '#0f172a', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
            {submitError && (
              <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '12px', fontWeight: 600 }}>
                ⚠ שגיאה בשליחה, אנא נסה שנית
              </p>
            )}
            <button onClick={submitReport} disabled={isSubmitting} style={{ width: '100%', padding: '18px', background: isSubmitting ? '#86efac' : '#22c55e', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 900, fontSize: '18px', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(34,197,94,0.3)', transition: 'background 0.2s' }}>
              {isSubmitting ? 'שולח...' : 'שלח וסיים אירוע'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
