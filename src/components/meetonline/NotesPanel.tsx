import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { PenLine, CheckCheck, Clock } from 'lucide-react';

interface NotesPanelProps {
  roomCode: string;
  socket: Socket;
  token: string;
}

export default function NotesPanel({ roomCode, socket, token }: NotesPanelProps) {
  const [content, setContent] = useState('');
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'synced' | 'error'>('synced');
  const [charCount, setCharCount] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/notes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setContent(data.content || '');
          setCharCount((data.content || '').length);
        }
      } catch (err) {
        console.error('Error fetching room notes:', err);
      }
    };
    fetchNotes();

    const handleNotesUpdate = ({ content: newContent }: { content: string }) => {
      setContent(newContent);
      setCharCount(newContent.length);
      setSyncState('synced');
    };
    socket.on('notes-update', handleNotesUpdate);
    return () => {
      socket.off('notes-update', handleNotesUpdate);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [roomCode, socket, token]);

  const saveNotes = (value: string) => {
    setSyncState('saving');
    socket.emit('notes-update', { roomCode, content: value }, (response: { success?: boolean; error?: string }) => {
      if (response?.error) {
        setSyncState('error');
        return;
      }
      setSyncState('saved');
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setCharCount(val.length);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(val), 350);
  };

  return (
    <div className="flex flex-col h-full text-inherit" style={{ background: 'transparent' }}>
      {/* Header info */}
      <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--cr-border)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--cr-muted)' }}>
          <PenLine className="w-3.5 h-3.5 text-violet-500" />
          <span>Shared notes — visible to all</span>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
          syncState === 'synced' ? 'text-green-500' :
          syncState === 'saving' ? 'text-amber-500' :
          syncState === 'error' ? 'text-red-500' : 'text-sky-500'
        }`}>
          {syncState === 'error' ? (
            <span>Save failed</span>
          ) : syncState === 'saving' ? (
            <><Clock className="w-3 h-3 animate-spin" /> Saving</>
          ) : (
            <><CheckCheck className="w-3.5 h-3.5" /> {syncState === 'saved' ? 'Saved' : 'Synced'}</>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-3 flex flex-col min-h-0">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Start writing shared class notes here...&#10;&#10;Everyone in the class can see and edit these notes in real time."
          className="flex-1 w-full rounded-2xl p-4 text-xs md:text-sm placeholder:opacity-40 focus:outline-none resize-none font-mono leading-relaxed border transition-colors shadow-inner"
          style={{
            background: 'var(--cr-subtle)',
            borderColor: 'var(--cr-border)',
            color: 'inherit',
            minHeight: 0
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-muted)' }}>
        <span className="font-mono">{charCount} chars</span>
        <span>Real-time cloud sync</span>
      </div>
    </div>
  );
}
