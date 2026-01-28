import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Emergency() {
  const { id } = useParams(); 
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!id) return;
      try {
        // מנסה למשוך את פרטי המבוטח לפי ה-ID שבברקוד
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setPatient(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching patient:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [id]);

  if (loading) return <div style={{textAlign: 'center', marginTop: '50px', fontSize: '20px'}}>טוען נתוני חירום...</div>;

  if (!patient) return (
    <div style={{textAlign: 'center', padding: '20px', direction: 'rtl'}}>
      <h2 style={{color: 'red'}}>❌ לא נמצא מבוטח</h2>
      <p>הצמיד הזה עדיין לא שויך למטופל במערכת.</p>
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', direction: 'rtl', textAlign: 'right', fontFamily: 'sans-serif' }}>
      
      {/* כותרת אדומה בולטת */}
      <div style={{ 
        backgroundColor: '#ffebee', 
        color: '#d32f2f', 
        padding: '15px', 
        borderRadius: '8px', 
        border: '2px solid #d32f2f', 
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>⚠️ מטופל לפניך</h1>
        <p style={{ margin: '5px 0 0 0' }}>יש לפעול בהתאם לפרוטוקול</p>
      </div>

      {/* כרטיס פרטים */}
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '12px', 
        padding: '20px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        backgroundColor: 'white'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '28px', color: '#333' }}>
          {patient.firstName} {patient.lastName}
        </h2>
        
        <div style={{ fontSize: '18px', lineHeight: '1.6', color: '#555' }}>
          <p><strong>🆔 תעודת זהות:</strong> {patient.idNumber || '---'}</p>
          <p><strong>📍 עיר מגורים:</strong> {patient.city || '---'}</p>
          <p><strong>📝 הערות רפואיות:</strong> {patient.notes || 'אין הערות מיוחדות'}</p>
        </div>
        
        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
        
        {/* כפתור חיוג חירום */}
        {patient.emergencyPhone && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>איש קשר לחירום:</p>
            <a 
              href={`tel:${patient.emergencyPhone}`}
              style={{
                display: 'block',
                backgroundColor: '#d32f2f', // אדום חירום
                color: 'white',
                padding: '15px',
                borderRadius: '50px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '20px',
                boxShadow: '0 4px 10px rgba(211, 47, 47, 0.3)'
              }}
            >
              📞 חייג עכשיו: {patient.emergencyPhone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}