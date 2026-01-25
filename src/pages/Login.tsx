import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logAction } from '../services/logger';

const Login: React.FC = () => {
  const [personalCode, setPersonalCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // הגדרת המשתמשים והתפקידים
    const validCodes: { [key: string]: { name: string, role: 'master' | 'general_manager' } } = {
      '015875339': { name: 'מנהל מערכת (Master)', role: 'master' },      
      '2430':      { name: 'מנהל כללי',          role: 'general_manager' } 
    };

    if (validCodes[personalCode]) {
      const user = validCodes[personalCode];
      
      // שמירה בזיכרון הדפדפן לשימוש בניהול
      sessionStorage.setItem('currentUser', user.name);
      sessionStorage.setItem('accessLevel', user.role);
      
      await logAction(user.name, 'LOGIN_SUCCESS', `נכנס למערכת (תפקיד: ${user.role})`);
      navigate('/admin');
    } else {
      await logAction('Unknown', 'LOGIN_FAILED', `ניסיון שגוי עם קוד: ${personalCode}`);
      setError('❌ קוד גישה לא מורשה.');
      setPersonalCode('');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', fontFamily: 'Arial', direction: 'rtl' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '350px' }}>
        <div style={{ fontSize: '50px', marginBottom: '20px' }}>🛡️</div>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>בקרת כניסה</h2>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="קוד גישה אישי"
            value={personalCode}
            onChange={(e) => setPersonalCode(e.target.value)}
            style={{ width: '100%', padding: '15px', fontSize: '18px', textAlign: 'center', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px', letterSpacing: '3px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>
            כניסה
          </button>
        </form>
        {error && <p style={{ color: 'red', marginTop: '20px' }}>{error}</p>}
      </div>
    </div>
  );
};

export default Login;