import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Emergency({ tagId }: { tagId: string }) {
  const [patient, setPatient] = useState<any>(null);
  
  // ניהול נעילת המידע הרפואי
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

  if (!patient) return <div style={{textAlign:'center', marginTop: 50, fontFamily: 'sans-serif'}}>טוען נתונים...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', padding: '20px', fontFamily: 'Segoe UI, sans-serif', direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* לוגו */}
      <h1 style={{ color: '#2563eb', fontSize: '50px', fontWeight: '900', margin: '0 0 20px 0', letterSpacing: '2px' }}>re-co</h1>

      <div style={{ backgroundColor: 'white', borderRadius: '25px', padding: '25px', width: '100%', maxWidth: '380px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        
        <h2 style={{ color: '#d32f2f', fontSize: '28px', fontWeight: 'bold', margin: '0 0 15px 0' }}>⚠️ מצב חירום</h2>

        {/* פרוטוקול התנהגות - נשאר פתוח לכולם */}
        <div style={{ backgroundColor: '#212121', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px', textAlign: 'right', border: '1px solid #000' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #555', paddingBottom: '10px', color: '#ffeb3b', fontSize: '20px', fontWeight: 'bold' }}>🛑 פרוטוקול טיפול (חובה):</h3>
          <ul style={{ paddingRight: '20px', margin: 0, lineHeight: '1.6', fontSize: '15px' }}>
            <li style={{marginBottom: '8px'}}>✋ <strong>שמור מרחק:</strong> אל תיגע ללא אישור.</li>
            <li style={{marginBottom: '8px'}}>🤫 <strong>דבר ברוגע:</strong> טון שקט ואיטי.</li>
            <li style={{marginBottom: '8px'}}>👀 <strong>קשר עין:</strong> עדין, אל תבהה.</li>
            <li style={{marginBottom: '8px'}}>❓ <strong>שאלות פשוטות:</strong> כן/לא בלבד.</li>
            <li>🔇 <strong>נטרל רעשים:</strong> הרחק סקרנים.</li>
          </ul>
        </div>

        {/* כפתור החיוג */}
        <a href={`tel:${patient.emergencyPhone}`} style={{ textDecoration: 'none' }}>
          <button style={{ 
            width: '100%', 
            backgroundColor: '#d32f2f', 
            color: 'white', 
            padding: '15px', 
            borderRadius: '50px', 
            border: 'none', 
            fontSize: '22px', 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px', 
            boxShadow: '0 4px 15px rgba(211, 47, 47, 0.4)', 
            cursor: 'pointer',
            animation: 'pulse 2s infinite',
            marginBottom: '20px'
          }}>
            📞 חיוג חירום מיידי
          </button>
        </a>

        {/* פרטים אישיים ורפואיים */}
        <div style={{ textAlign: 'right', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '10px' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>{patient.firstName} {patient.lastName}</div>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '15px' }}>ת"ז: {patient.idNumber} | עיר: {patient.city}</div>
          
          {/* אזור רפואי נעול */}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: '15px' }}>
            
            {!isMedicalUnlocked ? (
              // --- מצב נעול ---
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔒</div>
                <strong style={{ display: 'block', color: '#555', marginBottom: '10px' }}>מידע רפואי חסוי</strong>
                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                  <input 
                    type="tel" 
                    placeholder="קוד גישה" 
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    style={{ width: '80px', padding: '8px', textAlign: 'center', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
                  />
                  <button 
                    onClick={handleUnlock}
                    style={{ backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 15px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    פתח
                  </button>
                </div>
                {errorMsg && <p style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>{errorMsg}</p>}
              </div>
            ) : (
              // --- מצב פתוח (אחרי קוד 1010) ---
              <div style={{ backgroundColor: '#fffde7', padding: '10px', borderRadius: '8px', borderRight: '4px solid #fbc02d', animation: 'fadeIn 0.5s' }}>
                <strong style={{ color: '#f57f17', display: 'block', marginBottom: '5px' }}>🔓 מידע רפואי:</strong>
                <span style={{ color: '#333', lineHeight: '1.5' }}>{patient.notes || 'אין הערות מיוחדות'}</span>
              </div>
            )}

          </div>
        </div>

      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}