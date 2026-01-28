import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth'; // חובה בשביל שהדפים האחרים יעבדו
import { auth } from '../services/firebase';

const Login: React.FC = () => {
  const [personalCode, setPersonalCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. הנה הרשימה המעודכנת עם הקודים הנכונים שלך
    const validCodes: { [key: string]: { name: string, role: 'master' | 'general_manager' } } = {
      '065942229': { name: 'George (Master)', role: 'master' },      
      '2430':      { name: 'מנהל כללי',       role: 'general_manager' } 
    };

    if (validCodes[personalCode]) {
      const user = validCodes[personalCode];
      
      try {
        // 2. פעולה קריטית: רישום מול פיירבייס כדי שיהיה מותר לך לראות את הדאשבורד
        await signInAnonymously(auth);

        // שמירה בזיכרון
        sessionStorage.setItem('currentUser', user.name);
        sessionStorage.setItem('accessLevel', user.role);
        
        // 3. מעבר לדף הראשי
        navigate('/'); 
      } catch (err) {
        console.error(err);
        setError('שגיאת התחברות לשרת נתונים');
      }
    } else {
      setError('❌ קוד גישה לא מורשה.');
      setPersonalCode('');
    }
    setLoading(false);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', fontFamily: 'Arial', direction: 'rtl' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '350px' }}>
        <div style={{ fontSize: '50px', marginBottom: '20px' }}>🛡️</div>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Recognition Live</h2>
        <p>מערכת ניהול - כניסה מורשית בלבד</p>
        
        <form onSubmit={handleLogin}>
          <input
            type="password" // או text אם אתה רוצה לראות את המספרים
            placeholder="קוד גישה אישי"
            value={personalCode}
            onChange={(e) => setPersonalCode(e.target.value)}
            style={{ width: '100%', padding: '15px', fontSize: '18px', textAlign: 'center', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px', letterSpacing: '3px' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '15px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'מבצע כניסה...' : 'כניסה'}
          </button>
        </form>
        {error && <p style={{ color: 'red', marginTop: '20px', fontWeight: 'bold' }}>{error}</p>}
      </div>
    </div>
  );
};

export default Login;