import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Emergency({ tagId }: { tagId: string }) {
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      const docSnap = await getDoc(doc(db, "users", tagId));
      if (docSnap.exists()) setPatient(docSnap.data());
    };
    fetchPatient();
  }, [tagId]);

  if (!patient) return <div style={{textAlign:'center', marginTop: 50}}>טוען פרטי חירום...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', direction: 'rtl', textAlign: 'right', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#ffebee', color: '#d32f2f', padding: '15px', borderRadius: '8px', border: '2px solid #d32f2f', marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>⚠️ מטופל לפניך</h1>
      </div>
      
      <div style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2>{patient.firstName} {patient.lastName}</h2>
        <p><strong>ת"ז:</strong> {patient.idNumber}</p>
        <p><strong>עיר:</strong> {patient.city}</p>
        <p><strong>הערות:</strong> {patient.notes}</p>
        <hr />
        
        <a href={`tel:${patient.emergencyPhone}`} style={{ display: 'block', backgroundColor: '#d32f2f', color: 'white', padding: '15px', textAlign: 'center', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', fontSize: '20px' }}>
          📞 חייג לחירום: {patient.emergencyPhone}
        </a>
      </div>
    </div>
  );
}