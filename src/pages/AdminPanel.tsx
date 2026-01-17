import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

// הגדרת סוגי המשתמשים
type UserRole = 'admin' | 'viewer';

const AdminPanel: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // הוספת משתנה לשגיאות
  
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('viewer'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [requestDetails, setRequestDetails] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    let isMounted = true; // למניעת דליפות זיכרון

    const fetchPatients = async () => {
      // 1. הגדרת טיימר ביטחון - אם לא עולה תוך 5 שניות, זרוק שגיאה
      const timeoutId = setTimeout(() => {
        if (isMounted && loading) {
          setLoading(false);
          setError("Timeout: החיבור ל-Firebase לוקח יותר מדי זמן. בדוק את האינטרנט או את ה-Rules.");
        }
      }, 5000);

      try {
        console.log("Starting fetch from Firebase..."); // לוג לבדיקה
        const querySnapshot = await getDocs(collection(db, 'patients'));
        
        if (querySnapshot.empty) {
          console.log("Collection is empty");
        }

        const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (isMounted) {
          setPatients(list);
          setError(null);
        }
      } catch (err: any) {
        console.error("Critical Error fetching data:", err);
        if (isMounted) {
          // הצגת הודעת השגיאה המדויקת מהשרת
          setError(`שגיאת חיבור: ${err.message || "Unknown Error"}`);
        }
      } finally {
        clearTimeout(timeoutId); // ביטול הטיימר אם הצליח
        if (isMounted) setLoading(false);
      }
    };

    fetchPatients();

    return () => { isMounted = false };
  }, []);

  // --- פונקציות הטיפול בבקשות (זהות לקוד הקודם) ---
  const handleRequestChange = (patient: any) => {
    setSelectedPatient(patient);
    setRequestDetails('');
    setIsModalOpen(true);
  };

  const submitChangeRequest = () => {
    if (!requestDetails.trim()) return;
    setStatusMsg('הבקשה נשלחה (סימולציה)');
    setTimeout(() => { setIsModalOpen(false); setStatusMsg(''); }, 2000);
  };
  // ------------------------------------------------

  // תצוגת טעינה ושגיאות
  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '20px' }}>⏳ טוען נתונים... (ממתין לתגובה)</div>;
  
  if (error) return (
    <div style={{ textAlign: 'center', marginTop: '50px', color: 'red', direction: 'rtl' }}>
      <h2>⛔ תקלה בטעינת הנתונים</h2>
      <p>הסיבה:</p>
      <code style={{ backgroundColor: '#f8d7da', padding: '10px', display: 'block', margin: '10px auto', maxWidth: '600px' }}>
        {error}
      </code>
      <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px' }}>נסה שוב</button>
    </div>
  );

  return (
    <div style={{ padding: '20px', direction: 'rtl', fontFamily: 'Arial', maxWidth: '1000px', margin: 'auto' }}>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba' }}>
        <strong>מצב בדיקה:</strong> אתה צופה כרגע כ- 
        <select 
          value={currentUserRole} 
          onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
          style={{ marginRight: '10px', padding: '5px' }}
        >
          <option value="admin">מנהל על (Admin)</option>
          <option value="viewer">מנהל מחוז (Viewer)</option>
        </select>
      </div>

      <h1 style={{ color: '#2c3e50' }}>ניהול מטופלים ({patients.length})</h1>
      
      {patients.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: '30px' }}>אין עדיין מטופלים רשומים במערכת.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'right' }}>
              <th style={thStyle}>שם מלא</th>
              <th style={thStyle}>מחוז</th>
              <th style={thStyle}>טלפון</th>
              <th style={thStyle}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{p.fullName}</td>
                <td style={tdStyle}>{p.district}</td>
                <td style={tdStyle}>{p.personalPhone}</td>
                <td style={tdStyle}>
                  {currentUserRole === 'admin' ? (
                    <button style={editBtnStyle}>✏️ ערוך</button>
                  ) : (
                    <button onClick={() => handleRequestChange(p)} style={requestBtnStyle}>📝 בקש שינוי</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* מודל בקשת שינויים */}
      {isModalOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0 }}>בקשת עדכון: {selectedPatient?.fullName}</h3>
            <textarea
              placeholder="מה לתקן?"
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              style={{ width: '100%', height: '100px', padding: '10px' }}
            />
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsModalOpen(false)} style={cancelBtnStyle}>ביטול</button>
              <button onClick={submitChangeRequest} style={submitBtnStyle}>שלח</button>
            </div>
            {statusMsg && <p style={{ color: 'green' }}>{statusMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

// Styles (אותם סגנונות)
const thStyle = { padding: '12px', borderBottom: '2px solid #dee2e6' };
const tdStyle = { padding: '12px' };
const editBtnStyle = { padding: '6px 12px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const requestBtnStyle = { padding: '6px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '500px' };
const cancelBtnStyle = { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const submitBtnStyle = { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };

export default AdminPanel;