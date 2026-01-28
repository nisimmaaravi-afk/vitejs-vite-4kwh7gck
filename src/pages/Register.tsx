import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Register({ tagId }: { tagId: string }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ phone: '', id: '', emergency: '' });
  
  const [formData, setFormData] = useState({
    fullName: '', 
    idNumber: '', 
    patientPhone: '', 
    emergencyPhone: '', 
    notes: ''
  });

  const validateInput = () => {
    let isValid = true;
    let newErrors = { phone: '', id: '', emergency: '' };

    if (formData.idNumber.length !== 9 || isNaN(Number(formData.idNumber))) {
      newErrors.id = 'תעודת זהות חייבת להכיל 9 ספרות';
      isValid = false;
    }

    const phoneRegex = /^05\d{8}$/;
    if (formData.patientPhone && !phoneRegex.test(formData.patientPhone)) {
      newErrors.phone = 'מספר לא תקין (חייב 10 ספרות, מתחיל ב-05)';
      isValid = false;
    }

    if (!phoneRegex.test(formData.emergencyPhone)) {
      newErrors.emergency = 'מספר חירום לא תקין';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name === 'patientPhone' ? 'phone' : e.target.name === 'emergencyPhone' ? 'emergency' : 'id']: '' });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput()) return;

    setLoading(true);
    try {
      await setDoc(doc(db, "users", tagId), {
        ...formData,
        tagId: tagId,
        createdAt: new Date(),
        firstName: formData.fullName.split(' ')[0], 
        lastName: formData.fullName.split(' ').slice(1).join(' ') || '',
        city: 'לא צוין'
      });
      window.location.href = `/?bid=${tagId}`;
    } catch (error) {
      alert("שגיאה בשמירה, נסה שוב.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)', direction: 'rtl', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '25px', width: '90%', maxWidth: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', position: 'relative', marginTop: '30px' }}>
        
        <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: 'black', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div style={{ background: '#e0f2fe', padding: '4px 12px', borderRadius: '15px', color: '#0284c7', fontSize: '12px', fontWeight: 'bold', marginTop: '-10px', position: 'relative', display: 'inline-block', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>📷 הוסף תמונה</div>
        </div>

        <div style={{ marginTop: '40px' }}>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div>
                <label style={labelStyle}>שם מלא (חובה):</label>
                <input type="text" name="fullName" placeholder="לדוגמה: ישראל ישראלי" onChange={handleChange} required style={inputStyle} />
            </div>

            <div>
                <label style={labelStyle}>תעודת זהות:</label>
                <input type="tel" name="idNumber" placeholder="מספר ת.ז (9 ספרות)" maxLength={9} onChange={handleChange} style={errors.id ? errorInputStyle : inputStyle} />
                {errors.id && <span style={errorTextStyle}>{errors.id}</span>}
            </div>

            <div>
                <label style={labelStyle}>טלפון מטופל:</label>
                <input type="tel" name="patientPhone" placeholder="050-..." maxLength={10} onChange={handleChange} style={errors.phone ? errorInputStyle : inputStyle} />
                {errors.phone && <span style={errorTextStyle}>{errors.phone}</span>}
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '15px', marginTop: '5px' }}>
                <label style={{ ...labelStyle, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                 📞 איש קשר לחירום (חובה):
                </label>
                <input type="tel" name="emergencyPhone" placeholder="מספר של קרוב משפחה" onChange={handleChange} required style={{ ...inputStyle, backgroundColor: '#fef2f2', borderColor: errors.emergency ? 'red' : '#fecaca' }} />
                {errors.emergency && <span style={errorTextStyle}>{errors.emergency}</span>}
            </div>

            <div>
                <label style={labelStyle}>📝 מידע רפואי / הערות:</label>
                <textarea name="notes" placeholder="רגישויות, מחלות רקע, תרופות..." onChange={handleChange} rows={3} style={{ ...inputStyle, height: 'auto' }} />
            </div>

            <button type="submit" disabled={loading} style={{ 
                marginTop: '10px', 
                padding: '15px', 
                background: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}>
                {loading ? 'שומר נתונים...' : '✅ בצע רישום'}
            </button>
            
            <div style={{textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '10px'}}>
                מספר צמיד: {tagId}
            </div>

            </form>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: '14px', fontWeight: 'bold', color: '#334155', marginBottom: '5px', display: 'block' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none', boxSizing: 'border-box' as 'border-box', backgroundColor: '#f8fafc' };
const errorInputStyle = { ...inputStyle, border: '1px solid #ef4444', backgroundColor: '#fff1f2' };
const errorTextStyle = { color: '#ef4444', fontSize: '12px', marginTop: '2px', display: 'block' };