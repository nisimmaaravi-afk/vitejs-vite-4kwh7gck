import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Emergency({ tagId }: { tagId: string }) {
  const [patient, setPatient] = useState<any>(null);
  const [isMedicalUnlocked, setIsMedicalUnlocked] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
    } else {
      setErrorMsg('קוד שגוי');
      setInputCode('');
    }
  };

  if (!patient) return <div style={{textAlign:'center', marginTop: 50, fontFamily: 'Segoe UI, sans-serif'}}>טוען נתונים...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)', padding: '20px', fontFamily: 'Segoe UI, sans-serif', direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Recognition <span style={{color: '#2563eb'}}>Live</span>
      </h1>

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
      </div>
      <style>{`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}