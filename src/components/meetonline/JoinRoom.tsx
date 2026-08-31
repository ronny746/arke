import { useState } from 'react';

interface JoinRoomProps {
  user: { username: string; role: string };
  token: string;
  onJoin: (roomCode: string, roomType: 'meeting' | 'live_class', mobile?: string) => void;
  onLogout: () => void;
}

export default function JoinRoom({ user, token, onJoin, onLogout }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState('');
  const [roomType, setRoomType] = useState<'meeting' | 'live_class'>('meeting');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomType })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }
      onJoin(data.roomCode, roomType, '');
    } catch (err: any) {
      setError(err.message || 'Error creating room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode) return;
    if (user.role === 'student' && (!mobile || mobile.length !== 10)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const cleanCode = roomCode.trim().toUpperCase();
      const res = await fetch(`/api/rooms/validate/${cleanCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Room is not valid or inactive');
      }
      onJoin(cleanCode, data.roomType || 'meeting', mobile);
    } catch (err: any) {
      setError(err.message || 'Invalid room code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center relative px-4 overflow-hidden bg-slate-50">
      {/* Background Animated Glows */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="w-full max-w-2xl glass-card rounded-2xl p-8 relative z-10 animate-fade-in shadow-2xl bg-white/70 border border-slate-100">
        {/* Header containing User details */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl">
              👤
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{user.username}</h2>
              <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:border-red-500/30 hover:text-red-500 hover:bg-red-50/50 transition"
          >
            Log Out
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room Panel (Teacher only) */}
          {user.role === 'teacher' ? (
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-slate-50/60 border border-slate-200/60">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Create a Class</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Set up a video classroom. Share the code with students so they can join.
                </p>

                {/* Class Mode Selection */}
                <div className="space-y-2 mb-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-left">Class Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRoomType('meeting')}
                      className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition flex flex-col items-center gap-1 ${
                        roomType === 'meeting'
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>👥 Call</span>
                      <span className="text-[9px] font-normal text-slate-400">Interactive</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomType('live_class')}
                      className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition flex flex-col items-center gap-1 ${
                        roomType === 'live_class'
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>📺 Live Class</span>
                      <span className="text-[9px] font-normal text-slate-400">One-way broadcast</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white rounded-xl font-semibold shadow-lg shadow-brand-500/10 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-slate-100/50 border border-slate-200 opacity-75">
              <div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Create Class</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Only teachers are authorized to launch new classroom sessions.
                </p>
              </div>
              <div className="mt-8 text-center text-xs text-slate-500 italic">
                Authorized role required
              </div>
            </div>
          )}

          {/* Join Room Panel */}
          <div className="flex flex-col justify-between p-6 rounded-2xl bg-slate-50/60 border border-slate-200/60">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Join Class</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Enter the shareable 6-digit classroom code provided by your instructor to join the live session.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Class Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-center font-mono font-bold tracking-widest text-lg"
                  placeholder="ABCDEF"
                />
              </div>

              {user.role === 'student' && (
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-center font-mono font-bold text-sm tracking-wider"
                    placeholder="Enter 10-digit number"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !roomCode || (user.role === 'student' && mobile.length !== 10)}
                className="w-full py-3.5 bg-slate-800 text-white hover:bg-slate-700 rounded-xl font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Validating...' : 'Join Class'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
