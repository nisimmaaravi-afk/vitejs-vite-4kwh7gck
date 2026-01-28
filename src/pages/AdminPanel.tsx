import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState<string>('');

  useEffect(() => {
    // שואב את השם של המנהל מהזיכרון
    const storedName = sessionStorage.getItem('currentUser');
    if (storedName) {
      setUser(storedName);
    }
  }, []);

  const handleLogout = () => {
    auth.signOut();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', direction: 'rtl', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* כותרת עליונה */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#333' }}>מערכת ניהול</h1>
        <button 
          onClick={handleLogout}
          style={{ backgroundColor: '#666', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}
        >
          יציאה
        </button>
      </div>

      <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>שלום, {user || 'מנהל'} 👋</h2>
        <p>ברוך הבא למרכז השליטה של Recognition Live.</p>
      </div>

      {/* כפתורי פעולה */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        {/* כפתור הרישום */}
        <div 
          onClick={() => navigate('/register')}
          style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '10px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            cursor: 'pointer',
            textAlign: 'center',
            border: '2px solid #2196f3',
            transition: 'transform 0.2s'
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>➕</div>
          <h3 style={{ margin: 0, color: '#2196f3' }}>רישום צמיד חדש</h3>
          <p style={{ color: '#666' }}>הוספת מטופל ושיוך צמיד</p>
        </div>

        {/* אפשר להוסיף כאן בעתיד כפתור לסטטיסטיקות או מפה */}
        <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '30px', 
            borderRadius: '10px', 
            textAlign: 'center',
            color: '#999'
          }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗺️</div>
          <h3 style={{ margin: 0 }}>מפת סריקות</h3>
          <p>בקרוב...</p>
        </div>

      </div>
    </div>
  );
}