import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from '../services/firebase';

interface RegisterProps {
  braceletId: string;
}

export default function Register({ braceletId }: RegisterProps) {
  const [formData, setFormData] = useState({
    name: '',
    personalId: '',
    patientPhone: '',
    emergencyPhone: '',
    story: '',
    photoUrl: '' 
  });
  
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("התמונה גדולה מדי. נסה תמונה קטנה יותר.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.name.trim()) {
      alert("חובה למלא שם מלא.");
      return;
    }

    if (!formData.emergencyPhone || !formData.emergencyPhone.trim()) {
      alert("לא ניתן להפעיל צמיד ללא איש קשר לחירום!");
      return;
    }

    if (formData.emergencyPhone.replace(/\D/g,'').length < 9) {
      alert("מספר טלפון חירום אינו תקין.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "patients"), {
        braceletId,
        ...formData,
        photoUrl: formData.photoUrl || "https://cdn-icons-png.flaticon.com/512/847/847969.png", 
        createdAt: serverTimestamp()
      });
      window.location.reload();
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("שגיאה בשמירה, נסה שוב");
      setLoading(false);
    }
  };

  return (
    <div style={containerS}>
      {/* אלמנטים דקורטיביים ברקע */}
      <div style={bubble1S}></div>
      <div style={bubble2S}></div>

      <div style={cardS}>
        <div style={{textAlign: 'center', marginBottom: '25px'}}>
          <h2 style={{color: '#1a73e8', margin: '0 0 5px 0', fontSize: '2rem'}}>רישום ראשוני ✨</h2>
          <p style={{letterSpacing: '2px', color: '#666', margin: 0, fontWeight: 'bold', fontSize: '0.9rem'}}>RECOGNITION LIVE</p>
        </div>

        <div style={{marginBottom: '20px', textAlign: 'center'}}>
           <label htmlFor="photo-upload" style={{cursor: 'pointer', display:'inline-block', position:'relative'}}>
             <img 
               src={formData.photoUrl || "https://cdn-icons-png.flaticon.com/512/3059/3059518.png"} 
               alt="Upload" 
               style={{
                 width: '110px', height: '110px', borderRadius: '50%', 
                 objectFit: 'cover', border: '5px solid white', 
                 boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                 backgroundColor: '#f0f4f8'
               }} 
             />
             <div style={{
               color: '#1a73e8', fontSize: '0.85rem', marginTop: '10px', 
               fontWeight: 'bold', backgroundColor:'#e3f2fd', 
               padding:'5px 15px', borderRadius:'20px', display:'inline-block'
             }}>
               {formData.photoUrl ? "📷 שנה תמונה" : "📷 הוסף תמונה"}
             </div>
           </label>
           <input id="photo-upload" type="file" accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
        </div>

        <div style={{textAlign: 'right'}}>
          
          <label style={labelS}>שם מלא (חובה):</label>
          <input 
            style={inputS} 
            placeholder="לדוגמה: ישראל ישראלי"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />

          <label style={labelS}>תעודת זהות:</label>
          <input 
            style={inputS} 
            type="number"
            placeholder="מספר ת.ז."
            value={formData.personalId}
            onChange={(e) => setFormData({...formData, personalId: e.target.value})}
          />

          <label style={labelS}>טלפון מטופל:</label>
          <input 
            style={inputS} 
            type="tel"
            placeholder="050-..."
            value={formData.patientPhone}
            onChange={(e) => setFormData({...formData, patientPhone: e.target.value})}
          />

          <hr style={{margin: '25px 0', border: 'none', borderTop:'2px dashed #eee'}} />

          <label style={{...labelS, color:'#c62828', fontSize:'1rem'}}>
            📞 איש קשר לחירום (חובה):
          </label>
          <input 
            style={{...inputS, borderColor:'#ffcdd2', backgroundColor:'#ffebee', borderWidth:'2px'}} 
            type="tel"
            placeholder="מספר של קרוב משפחה"
            value={formData.emergencyPhone}
            onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})}
          />

          <label style={labelS}>📝 מידע רפואי / הערות:</label>
          <textarea 
            style={{...inputS, height:'80px', fontFamily:'inherit'}} 
            placeholder="רגישויות, מחלות רקע, תרופות..."
            value={formData.story}
            onChange={(e) => setFormData({...formData, story: e.target.value})}
          />

          <button 
            onClick={handleSubmit} 
            disabled={loading}
            style={loading ? {...btnS, backgroundColor:'#ccc'} : btnS}
          >
            {loading ? "מפעיל צמיד..." : "✅ בצע רישום"}
          </button>
        </div>
        
        <div style={{marginTop:'20px', textAlign:'center', fontSize:'0.75rem', color:'#aaa'}}>
          מספר צמיד: {braceletId}
        </div>
      </div>
    </div>
  );
}

// --- סגנונות חדשים ומשמחים ---

const containerS: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '15px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  direction: 'rtl',
  position: 'relative',
  overflow: 'hidden' 
};

const bubble1S: React.CSSProperties = {
  position: 'absolute',
  top: '-50px',
  right: '-50px',
  width: '200px',
  height: '200px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.2)',
  zIndex: 0
};

const bubble2S: React.CSSProperties = {
  position: 'absolute',
  bottom: '-20px',
  left: '-20px',
  width: '150px',
  height: '150px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.15)',
  zIndex: 0
};

const cardS: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  width: '100%',
  maxWidth: '420px',
  borderRadius: '24px',
  padding: '30px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  position: 'relative',
  zIndex: 1,
  backdropFilter: 'blur(10px)'
};

const labelS: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: '600',
  fontSize: '0.9rem',
  color: '#444'
};

const inputS: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  marginBottom: '18px',
  borderRadius: '12px',
  border: '1px solid #e0e0e0',
  boxSizing: 'border-box',
  fontSize: '1rem',
  outline: 'none',
  transition: 'all 0.2s',
  backgroundColor: '#f9f9f9'
};

const btnS: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  background: 'linear-gradient(to right, #1a73e8, #0d47a1)',
  color: 'white',
  border: 'none',
  borderRadius: '14px',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '10px',
  boxShadow: '0 6px 20px rgba(26, 115, 232, 0.4)',
  transform: 'scale(1)',
  transition: 'transform 0.1s'
};