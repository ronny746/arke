import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from './Button';
import { X, ChevronLeft, ChevronRight, Crop, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/api/admin';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PDFCropDrawer({ file, isOpen, onClose, onCropComplete, targetFieldLabel }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCrop(null);
      setCompletedCrop(null);
    }
  }, [isOpen, pageNumber]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const handleInsertCrop = async () => {
    if (!completedCrop || !completedCrop.width || !completedCrop.height) {
      toast.error('Please select an area to crop first.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error('PDF canvas not found.');
      return;
    }

    try {
      setIsUploading(true);
      // Create a temporary canvas to draw the cropped portion
      const cropCanvas = document.createElement('canvas');
      const scaleX = canvas.width / canvas.clientWidth;
      const scaleY = canvas.height / canvas.clientHeight;
      
      cropCanvas.width = completedCrop.width * scaleX;
      cropCanvas.height = completedCrop.height * scaleY;
      
      const ctx = cropCanvas.getContext('2d');
      
      ctx.drawImage(
        canvas,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );

      // Convert to blob and then to File
      cropCanvas.toBlob(async (blob) => {
        if (!blob) {
          setIsUploading(false);
          return toast.error('Failed to create image blob.');
        }

        const croppedFile = new File([blob], `cropped-${Date.now()}.png`, { type: 'image/png' });
        const formData = new FormData();
        formData.append('file', croppedFile);

        try {
          const res = await adminAPI.uploadFile(formData);
          const uploadedUrl = res.data?.data?.url;
          
          if (uploadedUrl) {
            onCropComplete(uploadedUrl);
            toast.success('Image cropped and uploaded!');
            onClose();
          } else {
            throw new Error('No URL returned from upload API');
          }
        } catch (error) {
          console.error('Upload Error:', error);
          toast.error(error.response?.data?.message || 'Failed to upload image to S3');
        } finally {
          setIsUploading(false);
        }
      }, 'image/png', 1);
    } catch (error) {
      console.error('Crop Error:', error);
      toast.error('Failed to process cropped area.');
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-[90] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-[100dvh] w-[90vw] md:w-[500px] lg:w-[600px] bg-gray-50 shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Crop className="w-5 h-5 text-primary-600"/>
              Crop PDF for: <span className="text-primary-600">{targetFieldLabel || 'Editor'}</span>
            </h2>
            <p className="text-sm text-gray-500">Draw a box around the area you want to insert.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="gradient" 
              onClick={handleInsertCrop}
              disabled={!completedCrop || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                </>
              ) : 'Insert Image'}
            </Button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center">
          {file ? (
            <div className="bg-white shadow-lg inline-block relative">
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex justify-center p-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                  </div>
                }
              >
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                >
                  <Page 
                    pageNumber={pageNumber} 
                    canvasRef={canvasRef}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerWidth - 32 : 600} 
                  />
                </ReactCrop>
              </Document>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No PDF file loaded.
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {numPages > 1 && (
          <div className="bg-white p-4 pb-6 border-t flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Page</span>
              <input 
                type="number" 
                min={1} 
                max={numPages}
                value={pageNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= numPages) setPageNumber(val);
                }}
                className="w-16 px-2 py-1 border rounded text-center text-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="text-sm font-medium text-gray-600">of {numPages}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                disabled={pageNumber >= numPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
