import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // רשת ביטחון: אם הוידאו לא נטען תוך 4 שניות - שחרר את המשתמש
    const timer = setTimeout(() => {
      handleFinish();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleFinish = () => {
    setOpacity(0); // התחלת אנימציית היעלמות
    setTimeout(() => {
      setIsVisible(false);
      onFinish(); // הודעה ל-main שהסרטון נגמר
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      backgroundColor: '#ffffff', // רקע לבן נקי
      zIndex: 9999, // תמיד מעל הכל
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      opacity: opacity,
      transition: 'opacity 0.5s ease-out'
    }}>
      <video
        autoPlay
        muted
        playsInline // חובה למובייל
        onEnded={handleFinish} // כשהסרטון נגמר - סגור מסך
        style={{ width: '100%', maxWidth: '500px', height: 'auto' }}
      >
        {/* הנתיב חייב להיות מדויק לקובץ בתיקיית public */}
        <source src="/intro.mp4" type="video/mp4" />
      </video>
    </div>
  );
};

export default SplashScreen;