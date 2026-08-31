"use client";

import { useEffect, useState } from 'react';
import { useDeveloperStore, useAuthStore } from '@/store';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/modals/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/forms/index.jsx';
import axiosInstance from '@/api/axiosInstance';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';

export default function DeveloperModeListener() {
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDeveloperMode, activateDeveloperMode, deactivateDeveloperMode } = useDeveloperStore();

  const { user: storeUser } = useAuthStore();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (storeUser) {
      setCurrentUser(storeUser);
    } else {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, [storeUser]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if logged in user is the developer email
      if (currentUser?.email !== 'developer.abhishek.0929@gmail.com') return;

      // Ctrl+Shift+D or Cmd+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (isDeveloperMode) {
          deactivateDeveloperMode();
          toast.success("Developer Mode Deactivated");
        } else {
          setShowModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeveloperMode, deactivateDeveloperMode, currentUser]);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!pin) return;
    
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/developer-mode', { pin });
      activateDeveloperMode(res.data.data.developerToken);
      toast.success("Developer Mode Activated! Permanent deletion is now enabled.", { duration: 4000, icon: '🔥' });
      setShowModal(false);
      setPin('');
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid PIN or unauthorized.");
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="sm">
      <form onSubmit={handleActivate}>
        <ModalHeader title="Developer Authentication" onClose={() => setShowModal(false)} />
        <ModalBody>
          <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center">
              <Lock size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Enable Developer Mode</h3>
              <p className="text-sm text-surface-500 mt-1">
                This mode enables destructive actions like permanent deletion. Please enter your Master PIN to proceed.
              </p>
            </div>
            <div className="w-full mt-4">
              <Input
                type="password"
                placeholder="Enter Master PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                className="text-center tracking-[0.5em] text-lg font-bold"
                maxLength={4}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button type="submit" loading={loading} variant="danger">Unlock</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
