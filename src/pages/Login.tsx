import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // ייבוא של מנגנון הניווט הנכון

export default function Login() {
  const [accessCode, setAccessCode] = useState('');
  const [isAttempting, setIsAttempting] = useState(false);
  const [loginError, setLoginError] = useState(false);
  
  const navigate = useNavigate(); // הפעלת מנגנון הניווט

  // הקודים של Recognition Live למערכת השליטה
  const MASTER_CODE = '65942229';
  const FIELD_CODE = '2430';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAttempting(true);
    setLoginError(false);
    
    setTimeout(() => {
      if (accessCode === MASTER_CODE) {
        console.log("התחברות מאושרת (מאסטר) - מעביר לפאנל ניהול...");
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('userRole', 'master'); 
        
        // מעבר חלק ללא רענון דפדפן
        navigate('/admin'); 
        
      } else if (accessCode === FIELD_CODE) {
        console.log("התחברות מאושרת (שטח) - מעביר לתצוגת שטח...");
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('userRole', 'field'); 
        
        navigate('/field-view'); 
        
      } else {
        console.error("קוד שגוי");
        setLoginError(true);
        setIsAttempting(false);
        setAccessCode(''); 
      }
    }, 800);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#F0F4F8',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      direction: 'rtl',
      margin: 0,
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      
      <div style={{
        background: 'white',
        padding: '48px 40px',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
           <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield color="#2563eb" size={32} />
           </div>
        </div>
        
        <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: '12px 0 8px', letterSpacing: '-0.5px' }}>
          Recognition <span style={{ color: '#2563eb' }}>Live</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 600, margin: '0 0 32px' }}>
          מערכת שליטה ובקרה ארצית
        </p>

        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '13px', color: '#334155', marginBottom: '10px' }}>
              קוד גישה
            </label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                setLoginError(false); 
              }}
              placeholder="••••••••"
              maxLength={8}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: loginError ? '2px solid #ef4444' : '2px solid #e2e8f0',
                fontSize: '24px',
                background: loginError ? '#fef2f2' : '#f8fafc',
                outline: 'none',
                textAlign: 'center',
                letterSpacing: '6px',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                color: '#0f172a',
                direction: 'ltr'
              }}
              required
            />
            {loginError && (
              <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700, margin: '8px 0 0 0', textAlign: 'center' }}>
                קוד הגישה שגוי. אנא נסה שנית.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isAttempting || accessCode.length < 4}
            style={{
              width: '100%',
              padding: '18px',
              background: (isAttempting || accessCode.length < 4) ? '#94a3b8' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '18px',
              cursor: (isAttempting || accessCode.length < 4) ? 'not-allowed' : 'pointer',
              boxShadow: (isAttempting || accessCode.length < 4) ? 'none' : '0 8px 24px rgba(37,99,235,0.25)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {isAttempting ? 'מאמת נתונים...' : 'כניסה למערכת'} <span style={{ marginRight: '4px' }}>←</span>
          </button>
        </form>

        <div style={{ marginTop: '32px', width: '100%' }}>
          <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px' }}>
            © 2026 Recognition Live Systems <br/> גישה מורשית בלבד
          </p>
        </div>

      </div>
    </div>
  );
}