import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import logo from '../assets/logo.png'; // וודא שהלוגו קיים בתיקייה

export default function Register({ tagId }: { tagId: string }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', idNumber: '', city: '', emergencyPhone: '', notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await setDoc(doc(db, "users", tagId), { // שמירה באוסף users
        ...formData,
        tagId: tagId,
        createdAt: new Date()
      });
      // רענון כדי שהאפליקציה תזהה שהמשתמש קיים ותעבור למסך חירום
      window.location.reload();
    } catch (error) {
      alert("שגיאה בשמירה, נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', direction: 'rtl', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', margin: '20px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logo} alt="Recognition Live" style={{ height: '60px', marginBottom: '15px' }} onError={(e) => e.currentTarget.style.display='none'}/>
          <h2 style={{ color: '#1f2937', fontSize: '24px', margin: '0' }}>הפעלת צמיד חדש</h2>
          <p style={{ color: '#6b7280', marginTop: '5px' }}>מזהה צמיד: <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{tagId}</span></p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" name="firstName" placeholder="שם פרטי" onChange={handleChange} required style={inputStyle} />
            <input type="text" name="lastName" placeholder="שם משפחה" onChange={handleChange} required style={inputStyle} />
          </div>
          
          <input type="text" name="idNumber" placeholder="תעודת זהות" onChange={handleChange} style={inputStyle} />
          <input type="text" name="city" placeholder="עיר מגורים" onChange={handleChange} style={inputStyle} />
          
          <div style={{ position: 'relative' }}>
            <input type="tel" name="emergencyPhone" placeholder="טלפון חירום (חובה)" onChange={handleChange} required style={{ ...inputStyle, borderColor: '#ef4444', backgroundColor: '#fef2f2' }} />
            <span style={{ position: 'absolute', left: '10px', top: '12px', fontSize: '12px', color: '#ef4444' }}>*מציל חיים</span>
          </div>

          <textarea name="notes" placeholder="מידע רפואי רגיש / הערות..." onChange={handleChange} rows={3} style={{ ...inputStyle, height: 'auto' }} />

          <button type="submit" disabled={loading} style={{ 
            marginTop: '10px', 
            padding: '14px', 
            backgroundColor: loading ? '#9ca3af' : '#2563eb', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            fontSize: '16px', 
            fontWeight: 'bold', 
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
          }}>
            {loading ? 'מפעיל צמיד...' : 'שמור והפעל צמיד ➜'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 15px',
  borderRadius: '10px',
  border: '1px solid #e5e7eb',
  fontSize: '15px',
  backgroundColor: '#f9fafb',
  outline: 'none',
  boxSizing: 'border-box' as 'border-box',
  transition: 'border-color 0.2s',
};