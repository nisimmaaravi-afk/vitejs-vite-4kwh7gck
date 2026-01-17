import React from 'react';

interface EmergencyProps {
  patientData: any;
}

export default function Emergency({ patientData }: EmergencyProps) {
  if (!patientData) return <div style={{padding:'20px', textAlign:'center'}}>טוען נתונים...</div>;

  return (
    <div style={containerS}>
      <div style={bubble1S}></div>
      <div style={bubble2S}></div>

      <div style={cardS}>
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
          <div style={{fontSize: '2.5rem', marginBottom: '5px'}}>🚨</div>
          <h2 style={{color: '#d32f2f', margin: '0', fontSize: '2.2rem', fontWeight:'800'}}>זיהוי חירום</h2>
          <p style={{letterSpacing: '2px', color: '#b71c1c', margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '0.9rem', opacity:0.7}}>
            RECOGNITION LIVE
          </p>
        </div>

        <div style={{display:'flex', justifyContent:'center', marginBottom:'20px'}}>
          <img 
            src={patientData.photoUrl || "https://cdn-icons-png.flaticon.com/512/847/847969.png"} 
            alt="Patient" 
            style={imageS} 
          />
        </div>

        <div style={{textAlign: 'center', marginBottom:'25px'}}>
          <h1 style={nameS}>{patientData.name}</h1>
          <div style={idBadgeS}>ת"ז: {patientData.personalId || "לא צוין"}</div>
        </div>

        <hr style={{border:'none', borderTop:'2px dashed #ffcdd2', margin:'20px 0'}} />

        <div style={{textAlign:'center', marginBottom:'25px'}}>
          <label style={{display:'block', marginBottom:'8px', color:'#d32f2f', fontWeight:'bold'}}>
            איש קשר לחירום:
          </label>
          <a href={`tel:${patientData.emergencyPhone}`} style={callButtonS}>
             <span style={{fontSize:'1.8rem', marginRight:'10px'}}>📞</span>
             <div>
                <div style={{fontSize:'1.3rem'}}>חייג עכשיו</div>
                <div style={{fontSize:'0.9rem', fontWeight:'normal', opacity:0.9}}>
                  {patientData.emergencyPhone}
                </div>
             </div>
          </a>
        </div>

        <div style={infoBoxS}>
          <h3 style={infoTitleS}>📝 מידע רפואי חשוב:</h3>
          <p style={infoTextS}>
            {patientData.story || "אין מידע רפואי נוסף."}
          </p>
        </div>
        
        <div style={footerS}>
           מיקום GPS נשלח למשפחה באופן אוטומטי ✅
           <br/>
           <span style={{opacity:0.6, fontSize:'0.75rem'}}>BID: {patientData.braceletId}</span>
        </div>
      </div>
    </div>
  );
}

// --- סגנונות ---
const containerS: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif',
  direction: 'rtl', position: 'relative', overflow: 'hidden'
};

const bubble1S: React.CSSProperties = {
  position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px',
  borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)', zIndex: 0
};

const bubble2S: React.CSSProperties = {
  position: 'absolute', bottom: '-20px', left: '-20px', width: '150px', height: '150px',
  borderRadius: '50%', background: 'rgba(255, 255, 255, 0.15)', zIndex: 0
};

const cardS: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)', width: '100%', maxWidth: '400px',
  borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px rgba(198, 40, 40, 0.25)',
  position: 'relative', zIndex: 1, backdropFilter: 'blur(10px)', borderTop: '5px solid #d32f2f'
};

const imageS: React.CSSProperties = {
  width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover',
  border: '4px solid white', boxShadow: '0 8px 20px rgba(211, 47, 47, 0.2)'
};

const nameS: React.CSSProperties = {
  fontSize: '2rem', margin: '0 0 5px 0', color: '#333', fontWeight: '800'
};

const idBadgeS: React.CSSProperties = {
  display: 'inline-block', backgroundColor: '#f5f5f5', padding: '6px 15px',
  borderRadius: '20px', color: '#555', fontSize: '1rem', fontWeight: '600', marginTop: '5px'
};

const callButtonS: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backgroundColor: '#d32f2f', color: 'white', textDecoration: 'none',
  padding: '15px 20px', borderRadius: '16px', fontWeight: 'bold',
  boxShadow: '0 8px 25px rgba(211, 47, 47, 0.5)', transition: 'transform 0.2s',
  border: '2px solid #b71c1c'
};

const infoBoxS: React.CSSProperties = {
  backgroundColor: '#fffde7', padding: '20px', borderRadius: '16px',
  borderRight: '5px solid #fbc02d', textAlign: 'right', marginTop: '20px'
};

const infoTitleS: React.CSSProperties = {
  margin: '0 0 8px 0', color: '#f57f17', fontSize: '1.1rem', fontWeight: 'bold'
};

const infoTextS: React.CSSProperties = {
  margin: 0, color: '#4e342e', lineHeight: '1.6', fontSize: '1rem'
};

const footerS: React.CSSProperties = {
  marginTop: '30px', textAlign: 'center', color: '#1b5e20', fontWeight: 'bold', fontSize: '0.9rem'
};