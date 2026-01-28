import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // הנתונים שאנחנו אוספים
  const [formData, setFormData] = useState({
    tagId: '', // מספר הצמיד (חשוב מאוד!)
    firstName: '',
    lastName: '',
    idNumber: '',
    city: '',
    emergencyPhone: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tagId) {
      alert("חובה להזין את מספר הצמיד");
      return;
    }

    setLoading(true);

    try {
      // שמירה בפיירבייס: שם המסמך = מספר הצמיד
      // זה מה שמאפשר לסריקה למצוא את המטופל אחר כך
      await setDoc(doc(db, "users", formData.tagId), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        idNumber: formData.idNumber,
        city: formData.city,
        emergencyPhone: formData.emergencyPhone,
        notes: formData.notes,
        createdAt: new Date()
      });

      alert("המטופל נרשם בהצלחה!");
      navigate('/'); // חזרה לדאשבורד
    } catch (error) {
      console.error("Error registering patient:", error);
      alert("שגיאה בשמירת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>® רישום מטופל חדש</h2>
      
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #90caf9' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>מספר צמיד (מהברקוד):</label>
          <input 
            type="text" 
            name="tagId" 
            value={formData.tagId} 
            onChange={handleChange}
            placeholder="למשל: 101, 102..." 
            style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            required 
          />
          <small style={{ color: '#666' }}>זהו המזהה שהסורק יחפש</small>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" name="firstName" placeholder="שם פרטי" onChange={handleChange} required style={inputStyle} />
          <input type="text" name="lastName" placeholder="שם משפחה" onChange={handleChange} required style={inputStyle} />
        </div>

        <input type="text" name="idNumber" placeholder="תעודת זהות" onChange={handleChange} style={inputStyle} />
        <input type="text" name="city" placeholder="עיר מגורים" onChange={handleChange} style={inputStyle} />
        
        <div style={{ border: '1px solid red', padding: '10px', borderRadius: '5px' }}>
          <label style={{ color: 'red', fontWeight: 'bold' }}>טלפון לחירום:</label>
          <input type="tel" name="emergencyPhone" placeholder="050-0000000" onChange={handleChange} required style={{...inputStyle, border: '1px solid red'}} />
        </div>

        <textarea 
          name="notes" 
          placeholder="הערות רפואיות / דגשים לטיפול..." 
          onChange={handleChange} 
          style={{ ...inputStyle, height: '80px' }} 
        />

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '15px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '18px', 
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {loading ? 'שומר נתונים...' : 'שמור מטופל'}
        </button>

        <button 
          type="button" 
          onClick={() => navigate('/')}
          style={{ padding: '10px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}
        >
          ביטול וחזרה
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '16px',
  width: '100%',
  boxSizing: 'border-box' as 'border-box'
};