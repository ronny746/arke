import { useState, useEffect } from 'react';
import Login from './components/Login';
import JoinRoom from './components/JoinRoom';
import ClassRoom from './components/ClassRoom';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<{ username: string; role: string } | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<'meeting' | 'live_class'>('meeting');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [view, setView] = useState<'login' | 'join' | 'classroom'>('login');

  useEffect(() => {
    if (token && user) {
      setView('join');
    } else {
      setView('login');
    }
  }, [token, user]);

  const handleLogin = (newToken: string, newUser: { username: string; role: string }) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setRoomCode(null);
    setMobileNumber('');
    setView('login');
  };

  const handleJoinRoom = (code: string, type: 'meeting' | 'live_class', mobile?: string) => {
    setRoomCode(code);
    setRoomType(type);
    setMobileNumber(mobile || '');
    setView('classroom');
  };

  return (
    <div className={`min-h-screen ${view === 'classroom' ? 'h-screen overflow-hidden' : ''} bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white`}>
      {view === 'login' && <Login onLogin={handleLogin} />}
      {view === 'join' && user && token && (
        <JoinRoom user={user} token={token} onJoin={handleJoinRoom} onLogout={handleLogout} />
      )}
      {view === 'classroom' && user && token && roomCode && (
        <ClassRoom
          user={user}
          token={token}
          roomCode={roomCode}
          roomType={roomType}
          mobile={mobileNumber}
          onLeave={() => setView('join')}
        />
      )}
    </div>
  );
}
