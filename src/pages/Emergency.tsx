import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Shield, CheckCircle, Activity, Phone, AlertCircle } from 'lucide-react';

/**
 * Recognition Live - Official Emergency Module
 * פותח עבור: George
 */

interface PatientData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  emergencyPhone?: string;
  idNumber?: string;
  city?: string;
  photoURL?: string;
  notes?: string;
}

export default function Emergency({ tagId }: { tagId: string }) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [isMedicalUnlocked, setIsMedicalUnlocked] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({ outcome: 'calmed_down', notes: '' });
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const startTimeRef = useRef(Date.now());

  // חילוץ שם פרטי עבור מסך התודה
  const getFirstName = (name: string): string => {
    if (!name) return "המטופל";
    return name.trim().split(' ')[0];
  };

  // משיכת מיקום GPS ברקע
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      }, (err) => console.log("Location access denied"));
    }
  }, []);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!tagId) return;
      const docSnap = await getDoc(doc(db, "users", tagId));
      if (docSnap.exists()) setPatient(docSnap.data() as PatientData);
    };
    fetchPatient();

    const checkTimeElapsed = () => {
        if (reportSubmitted) return;
        const now = Date.now();
        if (now - startTimeRef.current >= 3600000) setShowReportForm(true);
    };

    const interval = setInterval(checkTimeElapsed, 60000);
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') checkTimeElapsed();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tagId, reportSubmitted]);

  // לוגיקת יציאה מאובטחת - 15 שניות
  useEffect(() => {
    if (reportSubmitted) {
      const timer = setTimeout(() => {
        window.location.replace('https://www.google.com');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [reportSubmitted]);

  const handleUnlock = async () => {
    if (inputCode === '1010') {
      setIsMedicalUnlocked(true);
      setErrorMsg('');
      
      // שליחת המיקום ל-Admin Panel כחלק מהלוג
      await addDoc(collection(db, 'system_logs'), {
        action: 'MEDICAL_UNLOCK',
        details: tagId,
        timestamp: serverTimestamp(),
        location: currentLocation, // כאן הנתון עובר למפה
        user: 'Scanner'
      });
    } else {
      setErrorMsg('קוד שגוי');
      setInputCode('');
    }
  };

  const submitReport = async () => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        action: 'EVENT_RESOLVED', 
        details: tagId,
        outcome: reportData.outcome,
        notes: reportData.notes,
        timestamp: serverTimestamp(),
        location: currentLocation,
        user: 'Scanner'
      });
      setReportSubmitted(true);
    } catch (e) {
      console.error("Error submitting report", e);
    }
  };

  if (!patient) return <div className="min-h-screen flex items-center justify-center font-sans">טוען נתונים...</div>;

  if (reportSubmitted) {
    const firstName = getFirstName(patient.fullName || patient.firstName || "");
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center font-sans p-6 text-center text-white" dir="rtl">
        <div className="max-w-md w-full animate-in zoom-in duration-500">
          <div className="mb-8 relative flex justify-center">
             <CheckCircle size={100} className="text-green-500 animate-bounce" />
             <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping"></div>
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tight">Recognition Live</h2>
          <p className="text-xl text-slate-300 leading-relaxed mb-8">
             <span className="text-white font-bold">{firstName}</span> מודה לך מקרב לב על העזרה. בזכותך האירוע הסתיים בבטחה.
          </p>
          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Shield size={16} />
                <span>מנקה מידע רפואי ויוצא בבטחה...</span>
             </div>
             <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden max-w-xs">
                <div className="bg-green-500 h-full animate-progress origin-left"></div>
             </div>
          </div>
        </div>
        <style>{`
          @keyframes progress { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
          .animate-progress { animation: progress 15s linear forwards; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-200 p-5 font-sans flex flex-col items-center" dir="rtl">
      
      <h1 className="text-slate-900 text-2xl font-black mb-5 uppercase tracking-widest">
        Recognition <span className="text-blue-600">Live</span>
      </h1>

      {showReportForm ? (
        <div className="bg-white rounded-[25px] p-8 w-full max-w-md shadow-2xl border-2 border-blue-600 relative z-10 animate-in slide-in-from-bottom">
          <h3 className="text-slate-900 font-bold text-center text-xl mb-6 tracking-tight">📝 סיכום וסיום אירוע</h3>
          
          <label className="font-bold block mb-2 text-slate-700">כיצד הסתיים האירוע?</label>
          <select 
            value={reportData.outcome} 
            onChange={(e) => setReportData({...reportData, outcome: e.target.value})}
            className="w-full p-3 rounded-xl border border-slate-200 mb-4 text-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="calmed_down">✅ הרגעה במקום</option>
            <option value="family_arrived">👨‍👩‍👧‍👦 הגעת בן משפחה</option>
            <option value="ambulance">🚑 פינוי באמבולנס</option>
            <option value="police">🚓 גורמי ביטחון</option>
            <option value="refused_help">❌ סירב לקבל עזרה</option>
          </select>

          <textarea 
            rows={4}
            value={reportData.notes}
            onChange={(e) => setReportData({...reportData, notes: e.target.value})}
            className="w-full p-3 rounded-xl border border-slate-200 mb-6 text-base"
            placeholder="הערות נוספות..."
          />

          <button onClick={submitReport} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg">שלח וסיים</button>
        </div>
      ) : (
        <div className="bg-white rounded-[25px] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in">
            <div className="bg-red-100 p-5 text-center border-b border-red-200">
                <h2 className="text-red-600 text-2xl font-black flex items-center justify-center gap-2 tracking-tighter">⚠️ מצב חירום</h2>
                <div className="text-red-700 text-xl font-bold mt-2">פוסט טראומטי לפניך!</div>
            </div>

            <div className="p-6">
                <div className="bg-slate-800 text-white p-5 rounded-2xl mb-6 shadow-lg">
                    <h3 className="text-yellow-400 font-bold text-lg mb-3 border-b border-slate-700 pb-2">🛑 פרוטוקול טיפול (חובה):</h3>
                    <ul className="space-y-3 text-[14px] text-slate-200">
                        <li className="flex items-start gap-2"><span>✋</span> <strong>שמור מרחק:</strong> אל תיגע ללא אישור.</li>
                        <li className="flex items-start gap-2"><span>🤫</span> <strong>דבר ברוגע:</strong> טון שקט ואיטי.</li>
                        <li className="flex items-start gap-2"><span>👀</span> <strong>קשר עין:</strong> עדין, אל תבהה.</li>
                        <li className="flex items-start gap-2"><span>❓</span> <strong>שאלות פשוטות:</strong> כן/לא בלבד.</li>
                    </ul>
                </div>

                <a href={`tel:${patient.emergencyPhone}`} className="no-underline">
                  <button className="w-full bg-red-600 text-white p-4 rounded-2xl text-2xl font-bold flex items-center justify-center gap-3 shadow-xl animate-pulse mb-8">
                      📞 חיוג חירום מיידי
                  </button>
                </a>

                <div className="text-center border-t border-slate-50 pt-5">
                    <div className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 flex items-center justify-center">
                        {patient.photoURL ? (
                            <img src={patient.photoURL} alt="Patient" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl">👤</span>
                        )}
                    </div>

                    <div className="text-2xl font-black text-slate-900 mb-1">
                        {patient.fullName || `${patient.firstName} ${patient.lastName}`}
                    </div>
                    <div className="text-slate-500 text-sm mb-6">
                       ת"ז: {patient.idNumber} | עיר: {patient.city || 'לא צוין'}
                    </div>
                
                    <div className="mt-2">
                        {!isMedicalUnlocked ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-slate-600 text-sm font-bold mb-3 flex items-center justify-center gap-2"><Shield size={16}/> מידע רפואי חסוי</div>
                            <div className="flex gap-2 justify-center">
                                <input 
                                    type="tel" 
                                    placeholder="קוד" 
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value)}
                                    className="w-20 p-2 text-center rounded-lg border border-slate-200 font-bold"
                                />
                                <button 
                                    onClick={handleUnlock}
                                    className="bg-slate-800 text-white px-5 py-2 rounded-lg font-bold"
                                >
                                    פתח
                                </button>
                            </div>
                            {errorMsg && <p className="text-red-600 text-xs mt-2 font-bold">{errorMsg}</p>}
                        </div>
                        ) : (
                        <div className="bg-orange-50 p-5 rounded-xl border-r-4 border-orange-500 text-right animate-in fade-in">
                            <strong className="text-orange-700 block mb-2 text-sm uppercase tracking-wider">🔓 מידע רפואי:</strong>
                            <span className="text-slate-800 text-lg font-medium leading-relaxed">{patient.notes || 'אין הערות מיוחדות'}</span>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 text-center">
                <button 
                  onClick={() => setShowReportForm(true)}
                  className="text-slate-400 text-sm underline hover:text-slate-600"
                >
                  ✅ סגור אירוע ושלח דיווח
                </button>
            </div>
        </div>
      )}
    </div>
  );
}