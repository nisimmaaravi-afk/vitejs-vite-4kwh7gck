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
    <>
      <style>{`
        * { box-sizing: border-box; }

        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #f3f4f6;
          direction: rtl;
          font-family: 'Segoe UI', Arial, sans-serif;
          padding: 20px;
        }

        .login-card {
          background: white;
          border-radius: 20px;
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          text-align: center;
        }

        .login-logo {
          width: 110px;
          margin-bottom: 20px;
        }

        .login-brand {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .login-subtitle {
          font-size: 15px;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 36px;
        }

        .login-divider {
          width: 40px;
          height: 3px;
          background: #2563eb;
          border-radius: 2px;
          margin: 0 auto 32px;
        }

        .login-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 8px;
          text-align: right;
        }

        .login-input {
          width: 100%;
          padding: 14px 16px;
          font-size: 20px;
          text-align: center;
          letter-spacing: 6px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          margin-bottom: 20px;
          outline: none;
          transition: border-color 0.2s;
          color: #0f172a;
          background: #f8fafc;
        }

        .login-input:focus {
          border-color: #2563eb;
          background: white;
        }

        .login-input.error {
          border-color: #ef4444;
        }

        .login-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(37,99,235,0.3);
          transition: transform 0.1s, box-shadow 0.2s;
          letter-spacing: 0.5px;
        }

        .login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(37,99,235,0.4);
        }

        .login-btn:active {
          transform: scale(0.98);
        }

        .login-error {
          color: #ef4444;
          font-size: 13px;
          font-weight: 600;
          margin-top: 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 14px;
        }

        .login-footer {
          margin-top: 32px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        /* Tablet */
        @media (max-width: 600px) {
          .login-card {
            padding: 36px 24px;
            border-radius: 16px;
          }
          .login-brand { font-size: 22px; }
          .login-btn { font-size: 16px; padding: 14px; }
        }

        /* Mobile */
        @media (max-width: 400px) {
          .login-card { padding: 28px 18px; }
          .login-logo { width: 85px; }
        }
      `}</style>

      <div className="login-page">
        <div className="login-card">

          <img src={logo} alt="Recognition Live" className="login-logo" />

          <div className="login-brand">
            Recognition <span style={{ color: '#2563eb' }}>Live</span>
          </div>
          <div className="login-subtitle">מערכת שליטה ובקרה ארצית</div>
          <div className="login-divider" />

          <form onSubmit={handleLogin}>
            <label className="login-label">קוד גישה</label>
            <input
              type="password"
              placeholder="••••••"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              className={`login-input${error ? ' error' : ''}`}
              autoComplete="current-password"
            />
            <button type="submit" className="login-btn">
              כניסה למערכת ➜
            </button>
          </form>

          {error && <div className="login-error">{error}</div>}

          <div className="login-footer">
            © 2026 Recognition Live Systems · גישה מורשית בלבד
          </div>
        </div>
      </div>
    </>
  );
}
