import { useEffect, useState } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Emergency({ tagId }: { tagId: string }) {
  const [patient, setPatient] = useState<any>(null);
  
  // נעילת מידע רפואי
  const [isMedicalUnlocked, setIsMedicalUnlocked] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ניהול סיום אירוע
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({ outcome: 'calmed_down', notes: '' });
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!tagId) return;
      const docSnap = await getDoc(doc(db, "users", tagId));
      if (docSnap.exists()) setPatient(docSnap.data());
    };
    fetchPatient();
  }, [tagId]);

  const handleUnlock = () => {
    if (inputCode === '1010') {
      setIsMedicalUnlocked(true);
      setErrorMsg('');
      
      // לוג: תיעוד שמישהו פתח את המידע הרפואי (נקודת דאטה חשובה)
      addDoc(collection(db, 'system_logs'), {
        action: 'MEDICAL_UNLOCK',
        details: tagId,
        timestamp: serverTimestamp(),
        user: 'Scanner'
      });

    } else {
      setErrorMsg('קוד שגוי');
      setInputCode('');
    }
  };

  const submitReport = async () => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        action: 'EVENT_RESOLVED', // סוג אירוע חדש: סיום טיפול
        details: tagId,
        outcome: reportData.outcome, // מה קרה בסוף?
        notes: reportData.notes,     // הערות מילוליות
        timestamp: serverTimestamp(),
        user: 'Scanner'
      });
      setReportSubmitted(true);
    } catch (e) {
      console.error("Error submitting report", e);
      alert("שגיאה בשליחת הדיווח");
    }
  };

  if (!patient) return <div style={{textAlign:'center', marginTop: 50, fontFamily: 'Segoe UI, sans-serif'}}>טוען נתונים...</div>;

  // --- מסך תודה לאחר דיווח ---
  if (reportSubmitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Segoe UI, sans-serif', direction: 'rtl' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '25px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '80%' }}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>🙌</div>
          <h2 style={{ color: '#0f172a', margin: '0 0 10px 0' }}>תודה על הדיווח!</h2>
          <p style={{ color: '#64748b' }}>המידע נקלט במערכת ועוזר לנו לשפר את המענה.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>סגור</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)', padding: '20px', fontFamily: 'Segoe UI, sans-serif', direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Recognition <span style={{color: '#2563eb'}}>Live</span>
      </h1>

      {/* אם המשתמש לחץ על סיום אירוע - מציגים את הטופס */}
      {showReportForm ? (
        <div style={{ backgroundColor: 'white', borderRadius: '25px', padding: '30px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', textAlign: 'center' }}>📝 סיכום אירוע</h3>
          <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginBottom: '20px' }}>המידע הזה קריטי לשיפור השירות בעתיד.</p>
          
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#334155' }}>כיצד הסתיים האירוע?</label>
          <select 
            value={reportData.outcome} 
            onChange={(e) => setReportData({...reportData, outcome: e.target.value})}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', fontSize: '16px', background: 'white' }}
          >
            <option value="calmed_down">✅ הרגעה במקום (ללא פינוי)</option>
            <option value="family_arrived">👨‍👩‍👧‍👦 הגעת בן משפחה/מכר</option>
            <option value="ambulance">🚑 פינוי באמבולנס</option>
            <option value="police">police משטרה / גורמי ביטחון</option>
            <option value="refused_help">❌ סירב לקבל עזרה</option>
          </select>

          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#334155' }}>הערות נוספות (אופציונלי):</label>
          <textarea 
            rows={4}
            value={reportData.notes}
            onChange={(e) => setReportData({...reportData, notes: e.target.value})}
            placeholder="מה עזר? מה הפריע?..."
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '14px', fontFamily: 'inherit' }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={() => setShowReportForm(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>ביטול</button>
             <button onClick={submitReport} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>שלח דיווח</button>
          </div>
        </div>
      ) : (
        // --- המסך הרגיל (חירום) ---
        <div style={{ backgroundColor: 'white', borderRadius: '25px', padding: '0', width: '100%', maxWidth: '380px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
            
            <div style={{ backgroundColor: '#fee2e2', padding: '20px', textAlign: 'center', borderBottom: '1px solid #fecaca' }}>
                <h2 style={{ color: '#dc2626', fontSize: '26px', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    ⚠️ מצב חירום
                </h2>
                <div style={{ color: '#b91c1c', fontSize: '20px', fontWeight: 'bold', marginTop: '8px' }}>
                    פוסט טראומטי לפניך!
                </div>
            </div>

            <div style={{ padding: '25px' }}>
                
                <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px', textAlign: 'right', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #475569', paddingBottom: '10px', color: '#fbbf24', fontSize: '18px', fontWeight: 'bold' }}>
                    🛑 פרוטוקול טיפול (חובה):
                </h3>
                <ul style={{ paddingRight: '20px', margin: 0, lineHeight: '1.8', fontSize: '15px', color: '#e2e8f0' }}>
                    <li>✋ <strong>שמור מרחק:</strong> אל תיגע ללא אישור.</li>
                    <li>🤫 <strong>דבר ברוגע:</strong> טון שקט ואיטי.</li>
                    <li>👀 <strong>קשר עין:</strong> עדין, אל תבהה.</li>
                    <li>❓ <strong>שאלות פשוטות:</strong> כן/לא בלבד.</li>
                    <li>🔇 <strong>נטרל רעשים:</strong> הרחק סקרנים.</li>
                </ul>
                </div>

                <a href={`tel:${patient.emergencyPhone}`} style={{ textDecoration: 'none' }}>
                <button style={{ 
                    width: '100%', 
                    backgroundColor: '#dc2626', 
                    color: 'white', 
                    padding: '16px', 
                    borderRadius: '15px', 
                    border: 'none', 
                    fontSize: '22px', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px', 
                    boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)', 
                    cursor: 'pointer',
                    marginBottom: '30px',
                    animation: 'pulse 2s infinite'
                }}>
                    📞 חיוג חירום מיידי
                </button>
                </a>

                <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '5px' }}>
                        {patient.fullName || patient.firstName + ' ' + patient.lastName}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '16px', marginBottom: '20px' }}>
                       ת"ז: {patient.idNumber} | עיר: {patient.city || 'לא צוין'}
                    </div>
                
                    <div style={{ marginTop: '10px' }}>
                        {!isMedicalUnlocked ? (
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px border #e2e8f0' }}>
                            <div style={{ fontSize: '20px', marginBottom: '5px' }}>🔒</div>
                            <div style={{ color: '#475569', fontSize: '14px', marginBottom: '10px', fontWeight: 'bold' }}>מידע רפואי חסוי</div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <input 
                                type="tel" 
                                placeholder="קוד גישה" 
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                style={{ width: '100px', padding: '8px', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            />
                            <button 
                                onClick={handleUnlock}
                                style={{ backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 15px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                פתח
                            </button>
                            </div>
                            {errorMsg && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px', fontWeight: 'bold' }}>{errorMsg}</p>}
                        </div>
                        ) : (
                        <div style={{ backgroundColor: '#fff7ed', padding: '15px', borderRadius: '12px', borderRight: '4px solid #f97316', textAlign: 'right', animation: 'fadeIn 0.5s' }}>
                            <strong style={{ color: '#c2410c', display: 'block', marginBottom: '5px', fontSize: '14px' }}>🔓 מידע רפואי:</strong>
                            <span style={{ color: '#334155', lineHeight: '1.6', fontSize: '16px' }}>{patient.notes || 'אין הערות מיוחדות'}</span>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {/* כפתור סיום אירוע בתחתית */}
            <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <button 
                  onClick={() => setShowReportForm(true)}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ✅ סמן כאירוע שטופל / סיום אירוע
                </button>
            </div>
        </div>
      )}
      <style>{`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}