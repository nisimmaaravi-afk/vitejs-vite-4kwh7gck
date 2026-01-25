import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logAction } from '../services/logger';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlBraceletId = searchParams.get('id') || '';

  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    braceletId: urlBraceletId, 
    personalPhone: '',
    emergencyContact: '',
    medicalHistory: '',
    district: 'center'
  });

  const cleanNumber = (num: string) => num.replace(/\D/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ולידציות
    if (cleanNumber(formData.idNumber).length !== 9) {
      alert('❌ ת"ז חייבת להכיל 9 ספרות');
      return;
    }
    if (cleanNumber(formData.personalPhone).length !== 10) {
      alert('❌ טלפון אישי חייב להכיל 10 ספרות');
      return;
    }
    if (cleanNumber(formData.emergencyContact).length !== 10) {
      alert('❌ טלפון חירום חייב להכיל 10 ספרות');
      return;
    }
    if (!formData.braceletId) {
      alert('❌ חובה להזין מספר צמיד');
      return;
    }

    try {
      await addDoc(collection(db, 'patients'), { 
        ...formData, 
        createdAt: new Date(), 
        status: 'active' 
      });
      await logAction('System', 'REGISTER_NEW', `רישום: ${formData.fullName}`);
      alert('הרישום בוצע בהצלחה! ✨');
      navigate('/admin');
    } catch (error) {
      alert('שגיאה בשמירה');
      console.error(error);
    }
  };

  // סגנונות (Inline Styles) למניעת שגיאות CSS חיצוני
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid #eee',
    backgroundColor: '#f9f9f9',
    fontSize: '16px',
    marginTop: '5px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#555',
    marginRight: '5px',
    display: 'block'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)',
      display: 'flex',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'white',
        borderRadius: '30px',
        padding: '30px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
        direction: 'rtl',
        position: 'relative',
        marginTop: '20px'
      }}>
        
        {/* כותרת */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: '#0d6efd', fontSize: '26px', margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            ✨ רישום ראשוני
          </h1>
          <p style={{ color: '#888', fontSize: '11px', letterSpacing: '3px', marginTop: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>RECOGNITION LIVE</p>
        </div>

        {/* תמונת פרופיל */}
        <div style={{ textAlign: 'center', marginBottom: '30px', position: 'relative' }}>
          <div style={{ width: '90px', height: '90px', backgroundColor: 'black', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid white', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: '40px' }}>👤</span>
          </div>
          <button type="button" style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#e3f2fd', color: '#0d6efd', border: 'none', padding: '6px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            📷 הוסף תמונה
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>שם מלא (חובה):</label>
            <input required type="text" placeholder="לדוגמה: ישראל ישראלי" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>תעודת זהות:</label>
            <input type="tel" maxLength={9} placeholder="מספר ת.ז." value={formData.idNumber} onChange={(e) => setFormData({...formData, idNumber: e.target.value})} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>טלפון מטופל:</label>
            <input type="tel" maxLength={10} placeholder="050..." value={formData.personalPhone} onChange={(e) => setFormData({...formData, personalPhone: e.target.value})} style={{...inputStyle, direction: 'ltr', textAlign: 'right'}} />
          </div>

          {/* קו הפרדה */}
          <div style={{ borderTop: '2px dashed #eee', margin: '25px 0' }}></div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ ...labelStyle, color: '#d32f2f' }}>📞 איש קשר לחירום (חובה):</label>
            <input required type="tel" maxLength={10} placeholder="מספר של קרוב משפחה" value={formData.emergencyContact} onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} style={{ ...inputStyle, backgroundColor: '#ffebee', border: '1px solid #ffcdd2' }} />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={labelStyle}>📝 מידע רפואי / הערות:</label>
            <textarea rows={3} placeholder="רגישויות, מחלות, תרופות..." value={formData.medicalHistory} onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})} style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <button type="submit" style={{ width: '100%', padding: '16px', backgroundColor: '#0d6efd', color: 'white', fontSize: '18px', fontWeight: 'bold', border: 'none', borderRadius: '15px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(13, 110, 253, 0.25)', transition: 'transform 0.1s' }}>
            בצע רישום ✅
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', color: '#aaa', fontSize: '13px' }}>
          מספר צמיד: 
          <input type="text" value={formData.braceletId} onChange={(e) => setFormData({...formData, braceletId: e.target.value})} placeholder="1001" style={{ border: 'none', background: 'transparent', borderBottom: '1px solid #ccc', textAlign: 'center', width: '60px', margin: '0 5px', color: '#666', fontWeight: 'bold' }} />
        </div>

      </div>
    </div>
  );
};

export default Register;