"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './index';
import { Button } from '@/components/ui/Button';

// Dynamically import mathlive only on the client
let MathfieldElement: any = null;
if (typeof window !== 'undefined') {
  import('mathlive').then((module) => {
    MathfieldElement = module.MathfieldElement;
  });
}

interface VisualMathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
  initialValue?: string;
}

export const VisualMathModal: React.FC<VisualMathModalProps> = ({ isOpen, onClose, onInsert, initialValue = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInserting, setIsInserting] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    // We must wait for MathfieldElement to be loaded and registered
    const initMathLive = async () => {
      if (!MathfieldElement) {
        const module = await import('mathlive');
        MathfieldElement = module.MathfieldElement;
      }

      if (containerRef.current) {
        // Clear previous instances
        containerRef.current.innerHTML = '';
        
        // Create new element
        const mfe = new MathfieldElement();
        mfe.value = initialValue;
        
        // Setup styles and options for virtual keyboard
        mfe.style.width = '100%';
        mfe.style.fontSize = '24px';
        mfe.style.padding = '8px';
        mfe.style.border = '1px solid #e5e7eb';
        mfe.style.borderRadius = '8px';
        
        // Use mathlive's default virtual keyboard config which is great
        mfe.mathVirtualKeyboardPolicy = 'manual'; // we will show it manually
        
        containerRef.current.appendChild(mfe);
        mathFieldRef.current = mfe;
        
        // Auto show keyboard after a short delay
        setTimeout(() => {
          if (window.mathVirtualKeyboard) {
            window.mathVirtualKeyboard.show();
          }
        }, 100);
      }
      setIsReady(true);
    };

    initMathLive();

    return () => {
      if (window.mathVirtualKeyboard) {
        window.mathVirtualKeyboard.hide();
      }
    };
  }, [isOpen, initialValue]);

  const handleInsert = async () => {
    setIsInserting(true);
    // Short artificial delay to show loader to user so they know it processed
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (mathFieldRef.current) {
      onInsert(mathFieldRef.current.value);
    }
    
    setIsInserting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader title="Visual Math Editor 🧮" onClose={onClose} />
      <ModalBody className="p-4 pb-[350px]">
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-700 font-medium">
              Use the virtual keyboard below to build your math equation.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} size="sm" disabled={isInserting}>Cancel</Button>
              <Button onClick={handleInsert} disabled={!isReady || isInserting} size="sm" className="bg-amber-600 hover:bg-amber-700">
                {isInserting ? 'Inserting...' : 'Insert Equation'}
              </Button>
            </div>
          </div>
          <div ref={containerRef} className="w-full min-h-[100px] flex items-center justify-center bg-gray-50 rounded-lg p-4 shadow-inner" />
        </div>
      </ModalBody>
    </Modal>
  );
};
