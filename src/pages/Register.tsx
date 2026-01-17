import React, { useState } from 'react';
import { db } from '../services/firebase'; // כאן זה שתי נקודות כי הקובץ בתוך תיקיית pages
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const Register: React.FC = () => {
  // הגדרת המשתנים שחסרו לך
  const [formData, setFormData] = useState({
    fullName: '',
    tz: '',
    emergencyPhone: '',
    personalPhone: '',
    district: 'מרכז',
    medicalInfo: '',
    personalStory: ''
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');

    // ולידציה קשיחה של 9 ו-10 ספרות
    if (formData.tz.length !== 9) {
      setError('תעודת זהות חייבת להכיל בדיוק 9 ספרות');
      return;
    }
    if (formData.personalPhone.length !== 10 || formData.emergencyPhone.length !== 10) {
      setError('מספרי טלפון חייבים להכיל בדיוק 10 ספרות');
      return;
    }

    setStatus('שומר נתונים...');
    try {
      await addDoc(collection(db, 'patients'), {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'active'
      });
      setStatus('הרישום בוצע בהצלחה!');
      setFormData({ fullName: '', tz: '', emergencyPhone: '', personalPhone: '', district: 'מרכז', medicalInfo: '', personalStory: '' });
    } catch (err) {
      setError('חלה שגיאה בחיבור לשרת');
    }
  };

  const handleNumericInput = (field: string, value: string, length: number) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, length);
    setFormData({ ...formData, [field]: cleanValue });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto', direction: 'rtl' }}>
      <h2 style={{ textAlign: 'center' }}>רישום - Recognition Live</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input placeholder="שם מלא" value={formData.fullName} required style={inputStyle}
          onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
        
        <input placeholder="תעודת זהות (9 ספרות בלבד)" value={formData.tz} required style={inputStyle}
          onChange={(e) => handleNumericInput('tz', e.target.value, 9)} />

        <input placeholder="טלפון אישי (10 ספרות בלבד)" value={formData.personalPhone} required style={inputStyle}
          onChange={(e) => handleNumericInput('personalPhone', e.target.value, 10)} />

        <input placeholder="טלפון חירום (10 ספרות בלבד)" value={formData.emergencyPhone} required style={inputStyle}
          onChange={(e) => handleNumericInput('emergencyPhone', e.target.value, 10)} />

        <select value={formData.district} style={inputStyle} onChange={(e) => setFormData({...formData, district: e.target.value})}>
          <option value="צפון">צפון</option><option value="מרכז">מרכז</option><option value="דרום">דרום</option>
        </select>

        <textarea placeholder="הסיפור שלי" value={formData.personalStory} style={{...inputStyle, height: '100px'}}
          onChange={(e) => setFormData({...formData, personalStory: e.target.value})} />

        <button type="submit" style={btnStyle}>בצע רישום</button>
      </form>
      {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
      {status && <p style={{ color: 'green', textAlign: 'center', marginTop: '10px' }}>{status}</p>}
    </div>
  );
};

const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd' };
const btnStyle = { padding: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };

export default Register;