import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  Phone, Share2, Heart, VolumeX, Hand, PersonStanding, 
  Moon, BriefcaseMedical, AlertTriangle, X, CheckCircle, Shield 
} from 'lucide-react';

/**
 * Recognition Live - Official Emergency Module
 * מבוסס על העיצוב המקצועי שסיפקת.
 */

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
  const [reportData, setReportData] = useState({ outcome: 'calmed_down', notes: '' });
  
  const startTimeRef = useRef(Date.now());

  const getFirstName = (name: string): string => {
    if (!name) return "המטופל";
    return name.trim().split(' ')[0];
  };

  useEffect(() => {
    const fetchPatient = async () => {
      if (!tagId) return;
      const docSnap = await getDoc(doc(db, "users", tagId));
      if (docSnap.exists()) setPatient(docSnap.data() as PatientData);
    };
    fetchPatient();
  }, [tagId]);

  // יציאה מאובטחת לאחר 15 שניות
  useEffect(() => {
    if (reportSubmitted) {
      const timer = setTimeout(() => {
        window.location.replace('https://www.google.com');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [reportSubmitted]);

  const submitReport = async () => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        action: 'EVENT_RESOLVED', 
        details: tagId,
        outcome: reportData.outcome,
        notes: reportData.notes,
        timestamp: serverTimestamp(),
        user: 'Scanner'
      });
      setReportSubmitted(true);
    } catch (e) {
      console.error("Error submitting report", e);
    }
  };

  if (!patient) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      טוען נתונים...
    </div>
  );

  const firstName = getFirstName(patient.fullName || patient.firstName || "");

  // --- מסך תודה מעוצב ---
  if (reportSubmitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F0F4F8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        direction: 'rtl',
        fontFamily: "'Segoe UI', system-ui, sans-serif"
      }}>
        <div style={{
          background: 'white',
          padding: '48px',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          maxWidth: '420px',
          width: '100%'
        }}>
          <CheckCircle size={72} color="#22c55e" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>תודה רבה!</h2>
          <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '32px', lineHeight: 1.6 }}>
            <strong style={{ color: '#0f172a' }}>{firstName}</strong> מודה לך מקרב לב על העזרה. האירוע נסגר בבטחה.
          </p>
          <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              background: '#22c55e',
              height: '100%',
              animation: 'progress 15s linear forwards',
              transformOrigin: 'left'
            }} />
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>מנקה נתונים ויוצא בעוד 15 שניות...</p>
        </div>
        <style>{`@keyframes progress { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }`}</style>
      </div>
    );
  }

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      background: '#F0F4F8',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      color: '#0f172a',
      paddingBottom: '40px',
    },
    header: {
      background: 'white',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky' as const,
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: 900,
      fontSize: '16px',
      letterSpacing: '-0.5px'
    },
    activeBadge: {
      background: '#fee2e2',
      color: '#dc2626',
      fontSize: '10px',
      fontWeight: 800,
      padding: '4px 10px',
      borderRadius: '20px',
      letterSpacing: '0.5px'
    },
    main: {
      maxWidth: '960px',
      margin: '0 auto',
      padding: '24px 16px',
    },
    pageTitle: {
      fontSize: '26px',
      fontWeight: 900,
      marginBottom: '4px',
      color: '#0f172a'
    },
    pageMeta: {
      fontSize: '11px',
      color: '#94a3b8',
      marginBottom: '28px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
    },
    // LEFT COLUMN
    photoBox: {
      borderRadius: '20px',
      overflow: 'hidden',
      aspectRatio: '1/1',
      background: '#cbd5e1',
      position: 'relative' as const,
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
    },
    photoImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    },
    photoOverlay: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      padding: '20px 16px 16px',
      background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
    },
    photoName: {
      color: 'white',
      fontSize: '20px',
      fontWeight: 900,
      margin: 0
    },
    photoSub: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '1.5px',
      marginTop: '2px'
    },
    whatsHelpCard: {
      background: 'white',
      borderRadius: '20px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      marginTop: '16px'
    },
    whatsHelpTitle: {
      fontWeight: 800,
      fontSize: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '14px',
      color: '#2563eb'
    },
    helpItem: {
      display: 'flex',
      gap: '12px',
      padding: '12px',
      background: '#f8fafc',
      borderRadius: '14px',
      marginBottom: '8px',
      alignItems: 'flex-start'
    },
    helpItemTitle: {
      fontWeight: 700,
      fontSize: '13px',
      color: '#0f172a',
      margin: '0 0 2px'
    },
    helpItemDesc: {
      fontSize: '11px',
      color: '#64748b',
      margin: 0,
      lineHeight: 1.4
    },
    // RIGHT COLUMN
    callBtn: {
      display: 'block',
      background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      borderRadius: '18px',
      padding: '20px 24px',
      color: 'white',
      textDecoration: 'none',
      boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
      marginBottom: '12px',
    },
    callBtnTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    callBtnLabel: {
      fontSize: '10px',
      fontWeight: 800,
      opacity: 0.75,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: '4px'
    },
    callBtnName: {
      fontSize: '22px',
      fontWeight: 900,
      lineHeight: 1.1
    },
    callBtnPhone: {
      fontSize: '13px',
      opacity: 0.8,
      marginTop: '2px'
    },
    callBtnIcon: {
      background: 'rgba(255,255,255,0.2)',
      borderRadius: '50%',
      width: '48px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    callBtnFooter: {
      textAlign: 'center' as const,
      fontWeight: 800,
      fontSize: '12px',
      background: 'rgba(255,255,255,0.15)',
      borderRadius: '10px',
      padding: '8px',
      letterSpacing: '0.5px'
    },
    shareBtn: {
      width: '100%',
      background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
      borderRadius: '18px',
      padding: '18px 24px',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 8px 24px rgba(6,182,212,0.3)',
      marginBottom: '12px'
    },
    shareBtnLabel: {
      fontSize: '10px',
      fontWeight: 800,
      opacity: 0.75,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: '4px',
      textAlign: 'left' as const
    },
    shareBtnTitle: {
      fontSize: '18px',
      fontWeight: 900,
      textAlign: 'left' as const
    },
    shareBtnSub: {
      fontSize: '11px',
      opacity: 0.75,
      textAlign: 'left' as const,
      marginTop: '2px'
    },
    shareBtnIcon: {
      background: 'rgba(255,255,255,0.2)',
      borderRadius: '50%',
      width: '44px',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    protocolCard: {
      background: 'white',
      borderRadius: '20px',
      padding: '22px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    protocolTitle: {
      fontWeight: 800,
      fontSize: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '20px',
      color: '#0f172a'
    },
    protocolStep: {
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
      marginBottom: '20px'
    },
    stepNum: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#2563eb',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 900,
      fontSize: '14px',
      flexShrink: 0
    },
    stepTitle: {
      fontWeight: 700,
      fontSize: '14px',
      color: '#0f172a',
      marginBottom: '3px'
    },
    stepDesc: {
      fontSize: '12px',
      color: '#64748b',
      lineHeight: 1.5
    },
    alertBox: {
      marginTop: '16px',
      background: '#fff7ed',
      borderRadius: '14px',
      padding: '16px',
      border: '1px solid #fed7aa',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start'
    },
    alertTitle: {
      fontWeight: 800,
      fontSize: '11px',
      color: '#c2410c',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: '4px'
    },
    alertText: {
      fontSize: '13px',
      color: '#1e293b',
      fontWeight: 500,
      margin: 0
    },
    resolveBtn: {
      width: '100%',
      padding: '14px',
      background: 'none',
      border: 'none',
      color: '#94a3b8',
      fontSize: '12px',
      fontWeight: 700,
      cursor: 'pointer',
      textDecoration: 'underline',
      marginTop: '8px'
    },
    footer: {
      marginTop: '48px',
      padding: '24px',
      borderTop: '1px solid #e2e8f0',
      textAlign: 'center' as const,
      background: 'white'
    },
    footerQuote: {
      fontSize: '15px',
      fontWeight: 600,
      color: '#334155',
      fontStyle: 'italic',
      marginBottom: '16px',
      direction: 'rtl'
    },
    footerLinks: {
      display: 'flex',
      justifyContent: 'center',
      gap: '20px',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px'
    },
    // Overlay
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(15,23,42,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px',
      direction: 'rtl'
    },
    modal: {
      background: 'white',
      borderRadius: '28px',
      padding: '40px',
      width: '100%',
      maxWidth: '400px',
      boxShadow: '0 25px 80px rgba(0,0,0,0.2)',
      position: 'relative' as const
    },
    closeBtn: {
      position: 'absolute' as const,
      top: '20px',
      left: '20px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#94a3b8',
      display: 'flex'
    },
    modalTitle: {
      fontWeight: 900,
      fontSize: '22px',
      textAlign: 'center' as const,
      marginBottom: '24px',
      color: '#0f172a'
    },
    modalLabel: {
      fontWeight: 700,
      display: 'block',
      marginBottom: '8px',
      color: '#334155',
      fontSize: '13px'
    },
    modalSelect: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '14px',
      border: '2px solid #e2e8f0',
      marginBottom: '24px',
      fontSize: '16px',
      background: '#f8fafc',
      outline: 'none',
      color: '#0f172a'
    },
    submitBtn: {
      width: '100%',
      padding: '18px',
      background: '#22c55e',
      color: 'white',
      border: 'none',
      borderRadius: '18px',
      fontWeight: 900,
      fontSize: '18px',
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(34,197,94,0.3)'
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <Shield color="#2563eb" size={22} />
          <span>RECO <span style={{ color: '#2563eb' }}>חירום</span></span>
        </div>
        <div>
          <span style={styles.activeBadge}>● מצב חירום פעיל</span>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.pageTitle}>פרופיל חירום: {patient.fullName}</h1>
        <p style={styles.pageMeta}>
          🕒 סריקה אחרונה: {new Date().toLocaleDateString('he-IL')} (מיקום: {patient.city || 'ישראל'})
        </p>

        <div style={styles.grid}>
          
          {/* Left Column */}
          <div>
            <div style={styles.photoBox}>
              {patient.photoURL ? (
                <img src={patient.photoURL} alt="Patient" style={styles.photoImg} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700 }}>תמונה</div>
              )}
              <div style={styles.photoOverlay}>
                <p style={styles.photoName}>{patient.fullName}</p>
                <p style={styles.photoSub}>נושא צמיד PTSD</p>
              </div>
            </div>

            <div style={styles.whatsHelpCard}>
              <div style={styles.whatsHelpTitle}>
                <Heart size={18} fill="#2563eb" color="#2563eb" />
                מה עוזר לי
              </div>
              {[
                { icon: VolumeX, t: "דברו איתי בשקט", d: "שמרו על קול נמוך ורגוע." },
                { icon: Hand, t: "אל תגעו בי", d: "מגע פיזי עלול לגרום לתגובה." },
                { icon: PersonStanding, t: "תנו לי מרחב של 1.5 מטר", d: "שמרו על מרחק אלא אם יש סכנה מידית." },
                { icon: Moon, t: "עברו לאזור שקט", d: "הימנעו מאורות בהירים ורעשים חזקים." }
              ].map((item, i) => (
                <div key={i} style={styles.helpItem}>
                  <item.icon color="#3b82f6" size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <p style={styles.helpItemTitle}>{item.t}</p>
                    <p style={styles.helpItemDesc}>{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Call Button */}
            <a href={`tel:${patient.emergencyPhone}`} style={styles.callBtn}>
              <div style={styles.callBtnTop}>
                <div>
                  <p style={styles.callBtnLabel}>איש קשר לחירום</p>
                  <h2 style={styles.callBtnName}>{patient.fullName?.split(' ')[0] || 'איש קשר'}</h2>
                  <p style={styles.callBtnPhone}>{patient.emergencyPhone}</p>
                </div>
                <div style={styles.callBtnIcon}>
                  <Phone size={22} />
                </div>
              </div>
              <div style={styles.callBtnFooter}>לחצו לחיוג עכשיו</div>
            </a>



            {/* Protocol Card */}
            <div style={styles.protocolCard}>
              <div style={styles.protocolTitle}>
                <BriefcaseMedical color="#2563eb" size={18} />
                כיצד לעזור (פרוטוקול מגיב)
              </div>

              {[
                { n: "1", t: "הישארו איתי", d: "הישארו נוכחים וגלויים. אל תעזבו אותי לבד." },
                { n: "2", t: "התקשרו ושתפו מיקום", d: `הודיעו ל${firstName ? firstName : 'איש הקשר'} שאני חווה אפיזודת PTSD. לחצו על הכפתור הכחול למעלה לשיתוף מיקומי בזמן אמת.` },
                { n: "3", t: "בדקו תעודה רפואית", d: "אם אני לא מגיב, בדקו תעודה רפואית באפליקציית הבריאות בטלפון שלי לנתוני אלרגיות." }
              ].map((step, i) => (
                <div key={i} style={styles.protocolStep}>
                  <div style={styles.stepNum}>{step.n}</div>
                  <div>
                    <p style={styles.stepTitle}>{step.t}</p>
                    <p style={styles.stepDesc}>{step.d}</p>
                  </div>
                </div>
              ))}

              {/* Critical Alert */}
              <div style={styles.alertBox}>
                <AlertTriangle color="#f97316" size={22} style={{ flexShrink: 0 }} />
                <div>
                  <p style={styles.alertTitle}>⚠ מידע רפואי קריטי</p>
                  <p style={styles.alertText}>{patient.notes || 'לא סופק מידע קריטי.'}</p>
                </div>
              </div>
            </div>

            <button onClick={() => setShowReportForm(true)} style={styles.resolveBtn}>
              ✅ סמן אירוע כסגור / סיום אירוע
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerQuote}>
          "פוסט טראומה היא תווית שלא מבקשים, אבל הכרה היא תווית שכולנו ראויים לה."
        </p>
        <div style={styles.footerLinks}>
          <span>מדיניות פרטיות</span>
          <span>תנאי שימוש</span>
          <span>© 2026 Recognition Live Systems</span>
        </div>
      </footer>

      {/* Report Form Overlay */}
      {showReportForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <button onClick={() => setShowReportForm(false)} style={styles.closeBtn}>
              <X size={22} />
            </button>
            <h3 style={styles.modalTitle}>סיום אירוע</h3>
            <label style={styles.modalLabel}>כיצד הסתיים האירוע?</label>
            <select 
              value={reportData.outcome} 
              onChange={(e) => setReportData({...reportData, outcome: e.target.value})}
              style={styles.modalSelect}
            >
              <option value="calmed_down">✅ הרגעה במקום</option>
              <option value="family_arrived">👨‍👩‍👧‍👦 הגעת בן משפחה</option>
              <option value="ambulance">🚑 פינוי באמבולנס</option>
              <option value="police">🚓 גורמי ביטחון</option>
              <option value="refused_help">❌ סירב לקבל עזרה</option>
            </select>
            <button onClick={submitReport} style={styles.submitBtn}>שלח וסיים אירוע</button>
          </div>
        </div>
      )}
    </div>
  );
}
