import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from './services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logAction } from './services/logger';
import './App.css';

const App: React.FC = () => {
  const [searchParams] = useSearchParams(); 
  const braceletId = searchParams.get('id');
  const navigate = useNavigate();

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!braceletId) return;

      setLoading(true);
      setError('');
      
      try {
        const q = query(collection(db, 'patients'), where('braceletId', '==', braceletId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const patientData = querySnapshot.docs[0].data();
          setPatient(patientData);
          
          // --- תיעוד סריקה מוצלחת ליומן ---
          logAction('GuestScanner', 'SCAN', braceletId); 
          
        } else {
          setError('❌ הצמיד אינו רשום במערכת.');
          logAction('GuestScanner', 'SCAN_FAIL', `צמיד לא מוכר: ${braceletId}`);
        }
      } catch (err) {
        console.error(err);
        setError('שגיאת תקשורת.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [braceletId]);

  const handleUnlock = () => {
    if (passcode === '1010') setIsLocked(false);
    else { alert('קוד שגוי'); setPasscode(''); }
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCodes: { [key: string]: { name: string, role: string } } = {
      '015875339': { name: 'Master Admin', role: 'master' },
      '2430':      { name: 'General Manager', role: 'general_manager' }
    };

    if (validCodes[loginCode]) {
      const user = validCodes[loginCode];
      sessionStorage.setItem('currentUser', user.name);
      sessionStorage.setItem('accessLevel', user.role);
      await logAction(user.name, 'LOGIN', 'כניסת מנהל');
      navigate('/admin');
    } else {
      setLoginError('קוד זיהוי שגוי');
      await logAction('Unknown', 'LOGIN_FAIL', `ניסיון כניסה: ${loginCode}`);
    }
  };

  if (!braceletId) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontFamily: 'Arial' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '450px' }}>
        
        <h2 style={{ color: '#0d6efd', marginBottom: '30px', fontSize: '24px', whiteSpace: 'nowrap' }}>Recognition Live Secure Login</h2>
        
        <form onSubmit={handleManagerLogin}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="קוד זיהוי"
              value={loginCode}
              onChange={(e) => { setLoginCode(e.target.value); setLoginError(''); }}
              style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #dee2e6', backgroundColor: '#f8f9fa', fontSize: '16px', textAlign: 'right', outline: 'none' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(13, 110, 253, 0.3)' }}>
            כניסה מאובטחת
          </button>
        </form>
        {loginError && <p style={{ color: 'red', marginTop: '15px' }}>{loginError}</p>}
      </div>
    </div>
  );

  if (loading) return <div className="loading" style={{textAlign: 'center', marginTop: '50px'}}>⏳ טוען נתונים...</div>;
  if (error) return <div style={{textAlign: 'center', marginTop: '50px', direction: 'rtl'}}><h2 style={{color: 'red'}}>{error}</h2></div>;
  if (!patient) return null;

  return (
    <div className="container" style={{ direction: 'rtl', textAlign: 'center', padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#ffebee', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '2px solid #ef9a9a', animation: 'pulse 2s infinite' }}>
        <h1 style={{ color: '#c62828', margin: 0, fontSize: '26px' }}>⚠️ פוסט טראומטי לפניך</h1>
      </div>
      <div className="card" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '10px 0', fontSize: '28px', color: '#2c3e50' }}>{patient.fullName}</h2>
        <a href={`tel:100`} style={{ display: 'block', backgroundColor: '#dc3545', color: 'white', padding: '15px', borderRadius: '10px', textDecoration: 'none', fontSize: '22px', fontWeight: 'bold', margin: '20px 0', boxShadow: '0 4px 8px rgba(220,53,69,0.4)' }}>🚨 חייג בחירום</a>
        <div style={{ textAlign: 'right', backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
          <h3 style={{ color: '#0d47a1', marginTop: 0 }}>✋ פרוטוקול הכרה:</h3>
          <ul style={{ paddingRight: '20px', lineHeight: '1.6', fontSize: '16px', color: '#1565c0', margin: 0 }}>
            <li>שמור על מרחק אישי.</li>
            <li>דבר בטון שקט ורגוע.</li>
            <li>המנע מתנועות חדות.</li>
            <li>שאל: "איך אני יכול לעזור?"</li>
          </ul>
        </div>
        <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ fontSize: '18px', color: '#555' }}>🔒 מידע רפואי ואישי</h3>
          {isLocked ? (
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px dashed #ccc' }}>
              <p style={{ fontSize: '16px', marginBottom: '15px' }}>המידע חסוי. הזן קוד גישה:</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <input type="tel" maxLength={4} value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="****" style={{ width: '80px', padding: '10px', textAlign: 'center', fontSize: '20px', borderRadius: '8px', border: '1px solid #ccc', letterSpacing: '5px' }} />
                <button onClick={handleUnlock} style={{ backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', padding: '0 20px' }}>פתח</button>
              </div>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.5s' }}>
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f4c3', borderRadius: '8px' }}><strong>📞 {patient.personalPhone}</strong></div>
              <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px' }}><strong>📝 הסיפור שלי:</strong><p>{patient.medicalHistory}</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;