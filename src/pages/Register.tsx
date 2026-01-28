import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// התיקון: מקבל tagId
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
      await setDoc(doc(db, "users", tagId), {
        ...formData,
        tagId: tagId,
        createdAt: new Date()
      });
      window.location.reload();
    } catch (error) {
      alert("שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>הפעלת צמיד: <span style={{color:'blue'}}>{tagId}</span></h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" name="firstName" placeholder="שם פרטי" onChange={handleChange} required style={{padding: '10px'}} />
        <input type="text" name="lastName" placeholder="שם משפחה" onChange={handleChange} required style={{padding: '10px'}} />
        <input type="tel" name="emergencyPhone" placeholder="טלפון חירום" onChange={handleChange} required style={{padding: '10px', border: '1px solid red'}} />
        <button type="submit" disabled={loading} style={{ padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px' }}>
          {loading ? 'שומר...' : 'שמור והפעל'}
        </button>
      </form>
    </div>
  );
}