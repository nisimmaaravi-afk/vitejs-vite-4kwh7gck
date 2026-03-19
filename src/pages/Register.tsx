import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// הגדרת ה-Props כדי למנוע שגיאות TypeScript
interface RegisterProps {
  tagId: string;
}

export default function Register({ tagId }: RegisterProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ phone: '', id: '', emergency: '' });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- סטייטים עבור תנאי השימוש ואיסוף נתונים משפטיים ---
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [clientIP, setClientIP] = useState<string>('');
  const [termsText, setTermsText] = useState<string>('טוען תנאי שימוש...');

  const [formData, setFormData] = useState({
    fullName: '', 
    idNumber: '', 
    city: '',
    district: '',
    patientPhone: '', 
    emergencyPhone: '', 
    notes: ''
  });

  // משיכת כתובת ה-IP של המשתמש ותנאי השימוש מפאנל הניהול בעת טעינת המסך
  useEffect(() => {
    // משיכת IP
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIP(data.ip))
      .catch(err => console.error('Failed to fetch IP', err));

    // משיכת תקנון משפטי מ-Firestore
    const fetchTerms = async () => {
      try {
        const termsRef = doc(db, 'settings', 'legal');
        const termsSnap = await getDoc(termsRef);
        if (termsSnap.exists() && termsSnap.data().termsText) {
          setTermsText(termsSnap.data().termsText);
        } else {
          setTermsText('תנאי השימוש טרם הוזנו במערכת. אנא פנה למנהל המערכת.');
        }
      } catch (error) {
        console.error('Error fetching terms:', error);
        setTermsText('שגיאה בטעינת תנאי השימוש.');
      }
    };
    
    fetchTerms();
  }, []);

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

    if (!termsAccepted) {
      alert('חובה לקרוא ולאשר את תנאי השימוש וההגנה המשפטית כדי להמשיך.');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput()) return;

    setLoading(true);
    try {
      let photoURL = "";

      if (imageFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `patients/${tagId}/profile_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // שמירת הנתונים ב-Firestore עבור Recognition Live עם התיעוד המשפטי
      await setDoc(doc(db, "users", tagId), {
        ...formData,
        tagId: tagId,
        photoURL: photoURL,
        createdAt: new Date(),
        firstName: formData.fullName.split(' ')[0], 
        lastName: formData.fullName.split(' ').slice(1).join(' ') || '',
        legalConsent: {
          accepted: true,
          timestamp: new Date(),
          ipAddress: clientIP || 'Unknown IP',
          userAgent: navigator.userAgent
        }
      });
      
      // ריענון העמוד כדי לעבור למסך החירום המעודכן
      window.location.href = `/?bid=${tagId}`;
    } catch (error) {
      console.error("Error registering:", error);
      alert("שגיאה בשמירה, נסה שוב.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)', direction: 'rtl', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '25px', width: '90%', maxWidth: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', position: 'relative', marginTop: '30px', marginBottom: '30px' }}>
        
        <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <label style={{ cursor: 'pointer' }}>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                <div style={{ width: '80px', height: '80px', backgroundColor: 'black', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    )}
                </div>
                <div style={{ background: '#e0f2fe', padding: '4px 12px', borderRadius: '15px', color: '#0284c7', fontSize: '12px', fontWeight: 'bold', marginTop: '-10px', position: 'relative', display: 'inline-block', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {previewUrl ? '📸 שנה תמונה' : '📷 הוסף תמונה'}
                </div>
            </label>
        </div>

        <div style={{ marginTop: '40px' }}>
            <h2 style={{ textAlign: 'center', color: '#0f172a', marginBottom: '20px' }}>Recognition Live - רישום</h2>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                    <label style={labelStyle}>עיר:</label>
                    <input type="text" name="city" placeholder="עיר" onChange={handleChange} required style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>מחוז:</label>
                    <select name="district" onChange={handleChange} required style={{...inputStyle, appearance: 'none'}}>
                        <option value="">בחר...</option>
                        <option value="center">מרכז</option>
                        <option value="north">צפון</option>
                        <option value="south">דרום</option>
                    </select>
                </div>
            </div>

            <div>
                <label style={labelStyle}>טלפון מטופל:</label>
                <input type="tel" name="patientPhone" placeholder="050-..." maxLength={10} onChange={handleChange} style={errors.phone ? errorInputStyle : inputStyle} />
                {errors.phone && <span style={errorTextStyle}>{errors.phone}</span>}
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '15px' }}>
                <label style={{ ...labelStyle, color: '#dc2626' }}>📞 איש קשר לחירום (חובה):</label>
                <input type="tel" name="emergencyPhone" placeholder="מספר חירום" onChange={handleChange} required style={{ ...inputStyle, backgroundColor: '#fef2f2' }} />
                {errors.emergency && <span style={errorTextStyle}>{errors.emergency}</span>}
            </div>

            <div>
                <label style={labelStyle}>📝 מידע רפואי:</label>
                <textarea name="notes" placeholder="רגישויות, מחלות רקע..." onChange={handleChange} rows={3} style={{ ...inputStyle, height: 'auto' }} />
            </div>

            {/* --- אזור תנאי השימוש --- */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: termsAccepted ? '1px solid #10b981' : '1px solid #e2e8f0', transition: 'all 0.3s ease' }}>
                <input 
                  type="checkbox" 
                  checked={termsAccepted} 
                  onChange={() => {
                    if (!termsAccepted) {
                      setShowTermsModal(true); // פותח מודל במידה ועוד לא אושר
                    } else {
                      setTermsAccepted(false); // מאפשר הסרת סימון
                    }
                  }} 
                  style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }} 
                />
                <span style={{ fontSize: '13px', color: '#475569', cursor: 'pointer', lineHeight: '1.4' }} onClick={() => setShowTermsModal(true)}>
                  קראתי ואני מאשר/ת את <strong style={{ color: '#2563eb', textDecoration: 'underline' }}>תנאי השימוש וההגנה המשפטית</strong>
                </span>
            </div>

            <button type="submit" disabled={loading} style={{ 
                marginTop: '10px', padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: termsAccepted ? 1 : 0.6
            }}>
                {loading ? 'שומר נתונים...' : '✅ בצע רישום'}
            </button>
            
            <div style={{textAlign: 'center', fontSize: '12px', color: '#94a3b8'}}>צמיד: {tagId}</div>
            </form>
        </div>
      </div>

      {/* --- מודל (פופ-אפ) תנאי שימוש --- */}
      {showTermsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '450px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', textAlign: 'center', fontSize: '18px', fontWeight: '900' }}>תנאי שימוש והסרת אחריות</h3>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', fontSize: '14px', color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {termsText}
            </div>
            
            <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', backgroundColor: '#f8fafc', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' }}>
              <button 
                onClick={() => setShowTermsModal(false)} 
                style={{ flex: 1, padding: '14px', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
              >
                ביטול
              </button>
              <button 
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }} 
                style={{ flex: 2, padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
              >
                קראתי ואני מסכים/ה
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

const labelStyle = { fontSize: '14px', fontWeight: 'bold', color: '#334155', marginBottom: '5px', display: 'block' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', boxSizing: 'border-box' as 'border-box' };
const errorInputStyle = { ...inputStyle, border: '1px solid #ef4444' };
const errorTextStyle = { color: '#ef4444', fontSize: '12px', marginTop: '2px' };