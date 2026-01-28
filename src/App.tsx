import { Routes, Route } from 'react-router-dom';
import TagDispatcher from './TagDispatcher';

function App() {
  return (
    <Routes>
      {/* כל מי שנכנס לאתר מגיע ישר לדיספאצ'ר */}
      <Route path="/" element={<TagDispatcher />} />
    </Routes>
  );
}

export default App;