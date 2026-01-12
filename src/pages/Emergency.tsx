// src/pages/Emergency.tsx
import React from 'react';

// אנחנו מגדירים שהדף הזה מקבל מידע על המטופל (patientData)
interface EmergencyProps {
  patientData: any;
}

export default function Emergency({ patientData }: EmergencyProps) {
  return (
    <div style={{padding:'20px', direction:'rtl', textAlign:'center'}}>
      <h1 style={{color:'#1a73e8'}}>re-co</h1>
      
      {/* כרטיס החירום */}
      <div style={cardS}>
        <h2 style={{color:'red'}}>מצב חירום!</h2>
        
        {/* תמונת המטופל */}
        {patientData?.photoUrl && (
          <img 
            src={patientData.photoUrl} 
            alt="תמונת מבוטח" 
            style={{width:150, height:150, borderRadius:'50%', objectFit:'cover', border:'5px solid red', marginBottom:20}} 
          />
        )}
        
        {/* כפתור חיוג מהיר */}
        <a href={`tel:${patientData?.emergencyPhone}`} style={callBtnS}>
          📞 חיוג לאיש קשר
        </a>
        
        <h3>שם: {patientData?.name}</h3>
        
        {/* סיפור רפואי */}
        <div style={storyS}>
          <strong>רקע רפואי:</strong><br/>
          {patientData?.story}
        </div>
      </div>
    </div>
  );
}

// --- סגנונות מקומיים לדף החירום ---
const cardS: React.CSSProperties = { 
  backgroundColor:'#fff', 
  padding:'25px', 
  borderRadius:'20px', 
  boxShadow:'0 10px 25px rgba(0,0,0,0.05)', 
  maxWidth:'500px', 
  margin:'0 auto',
  borderTop:'10px solid red' // הגבול האדום למעלה
};

const callBtnS: React.CSSProperties = { 
  display:'block', 
  padding:'20px', 
  backgroundColor:'red', 
  color:'white', 
  borderRadius:'15px', 
  textDecoration:'none', 
  fontWeight:'bold', 
  fontSize:'1.4rem', 
  marginBottom:'15px' 
};

const storyS: React.CSSProperties = { 
  backgroundColor:'#fffde7', 
  padding:'15px', 
  borderRadius:'10px', 
  borderRight:'5px solid #fbc02d', 
  textAlign:'right', 
  whiteSpace:'pre-line' 
};