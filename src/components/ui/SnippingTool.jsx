import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Crop, X } from 'lucide-react';
import { Button } from './Button.jsx';
import toast from 'react-hot-toast';

export function SnippingTool({ targetId, disabled = false }) {
  const [isSnipping, setIsSnipping] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isSnipping) {
      setStartPos(null);
      setCurrentPos(null);
      document.body.style.userSelect = 'auto';
    } else {
      document.body.style.userSelect = 'none';
    }
  }, [isSnipping]);

  const handleMouseDown = (e) => {
    if (!isSnipping) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isSnipping || !startPos) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCurrentPos({ x, y });
  };

  const handleMouseUp = async () => {
    if (!isSnipping || !startPos || !currentPos) return;
    
    // Calculate bounding box
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width < 10 || height < 10) {
      // Too small, probably a click
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    setIsSnipping(false);
    toast.loading("Capturing snip...", { id: 'snip' });

    try {
      const targetElement = document.getElementById(targetId);
      if (!targetElement) throw new Error("Target not found");

      // Capture the whole target element
      const canvas = await html2canvas(targetElement, {
        useCORS: true,
        scale: window.devicePixelRatio || 2, // Higher quality
      });

      // Now crop the canvas to the selected box
      const cropCanvas = document.createElement('canvas');
      
      // The coordinates relative to the target element's actual dimensions
      // Note: overlay is exactly covering targetElement, but targetElement might be scrolled!
      // html2canvas captures the whole scrollable content if we capture the container.
      // Wait, if targetElement is scrollable, the overlay only covers the visible part.
      // To get the correct crop coordinates on the html2canvas output, we need to account for scroll.
      const scrollLeft = targetElement.scrollLeft || 0;
      const scrollTop = targetElement.scrollTop || 0;
      
      // html2canvas renders the full element including scroll, so the (x,y) from the overlay
      // needs to be offset by the scroll amount to match the captured canvas.
      const scale = window.devicePixelRatio || 2;
      cropCanvas.width = width * scale;
      cropCanvas.height = height * scale;
      const ctx = cropCanvas.getContext('2d');

      ctx.drawImage(
        canvas,
        (x + scrollLeft) * scale, 
        (y + scrollTop) * scale, 
        width * scale, 
        height * scale,
        0, 
        0, 
        width * scale, 
        height * scale
      );

      cropCanvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Failed to create image");
        
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          toast.success("Snipped! Press Ctrl+V to paste into the editor.", { id: 'snip', duration: 4000 });
        } catch (err) {
          console.error("Clipboard write failed", err);
          toast.error("Failed to copy to clipboard. Ensure site has clipboard permissions.", { id: 'snip' });
        }
      }, 'image/png');

    } catch (err) {
      console.error(err);
      toast.error("Snipping failed", { id: 'snip' });
    }
  };

  const getSelectionStyle = () => {
    if (!startPos || !currentPos) return { display: 'none' };
    const left = Math.min(startPos.x, currentPos.x);
    const top = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      position: 'absolute',
      border: '2px dashed #000',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      pointerEvents: 'none',
      zIndex: 50,
    };
  };

  return (
    <>
      <Button 
        variant={isSnipping ? "danger" : "secondary"} 
        size="sm" 
        onClick={() => setIsSnipping(!isSnipping)}
        disabled={disabled}
        icon={isSnipping ? X : Crop}
      >
        {isSnipping ? 'Cancel Snip' : 'Snip Tool'}
      </Button>

      {isSnipping && (
        <div 
          ref={overlayRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0 z-40 cursor-crosshair bg-black/5"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div style={getSelectionStyle()} />
        </div>
      )}
    </>
  );
}
