import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../services/firebase';
import logo from '../assets/logo.png'; 

export default function Login() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code === '065942229' || code === '2430') {
      try {
        await signInAnonymously(auth);
        
        // --- התיקון הקריטי: שמירת כרטיס הכניסה בזיכרון ---
        sessionStorage.setItem('isAdmin', 'true'); 
        sessionStorage.setItem('userRole', code === '065942229' ? 'master' : 'admin');
        
        console.log("Login successful, navigating to admin...");
        navigate('/admin'); 
      } catch (err: any) {
        console.error("Login failed:", err);
        setError('שגיאת התחברות: ' + err.message);
      }
    } else {
      setError('❌ קוד גישה שגוי');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '15px', textAlign: 'center', width: '300px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <img src={logo} alt="L" style={{ width: '100px', marginBottom: '15px' }} />
        <h2 style={{color: '#333'}}>כניסת מנהל</h2>
        <form onSubmit={handleLogin}>
          <input type="password" placeholder="קוד גישה" value={code} onChange={(e) => setCode(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '18px', textAlign: 'center', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '15px', boxSizing: 'border-box' }} />
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>כניסה</button>
        </form>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>
    </div>
  );
}