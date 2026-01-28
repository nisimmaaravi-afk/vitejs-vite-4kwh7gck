import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// מקבל את ה-ID מהדיספאצ'ר
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
      // שומר את המטופל לפי מספר הצמיד
      await setDoc(doc(db, "users", tagId), {
        ...formData,
        tagId: tagId,
        createdAt: new Date()
      });
      // אחרי שמירה - מרענן את הדף כדי שהמערכת תראה שהוא קיים ותעבור לחירום
      window.location.reload();
    } catch (error) {
      alert("שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>הפעלת צמיד חדש</h2>
      
      <div style={{ textAlign: 'center', marginBottom: '20px', backgroundColor: '#eef', padding: '10px', borderRadius: '5px' }}>
        <strong>מספר צמיד להפעלה: <span style={{color: 'blue'}}>{tagId}</span></strong>
      </div>
      
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" name="firstName" placeholder="שם פרטי" onChange={handleChange} required style={inputStyle} />
        <input type="text" name="lastName" placeholder="שם משפחה" onChange={handleChange} required style={inputStyle} />
        <input type="text" name="idNumber" placeholder="תעודת זהות" onChange={handleChange} style={inputStyle} />
        <input type="text" name="city" placeholder="עיר מגורים" onChange={handleChange} style={inputStyle} />
        <input type="tel" name="emergencyPhone" placeholder="טלפון חירום (חובה)" onChange={handleChange} required style={{...inputStyle, border: '1px solid red'}} />
        <textarea name="notes" placeholder="מידע רפואי חשוב..." onChange={handleChange} style={{ ...inputStyle, height: '80px' }} />

        <button type="submit" disabled={loading} style={{ padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'שומר ומפעיל...' : 'שמור והפעל צמיד'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px', width: '100%', boxSizing: 'border-box' as 'border-box' };