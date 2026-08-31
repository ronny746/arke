"use client";

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'suneditor/dist/css/suneditor.min.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { VisualMathModal } from '../modals/VisualMathModal';
import { Calculator } from 'lucide-react';

const SunEditor = dynamic(() => import('suneditor-react'), {
  ssr: false,
  loading: () => <p className="p-4 text-gray-400">Loading editor...</p>
});

interface AdvancedEditorProps {
  value: string;
  onChange: (content: string) => void;
  height?: string;
  className?: string;
}

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ 
  value, 
  onChange, 
  height = 'auto',
  className = ''
}) => {
  const editorRef = useRef<any>();
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);

  const getSunEditorInstance = (sunEditor: any) => {
    editorRef.current = sunEditor;
  };

  const handleInsertMath = (latex: string) => {
    if (editorRef.current && latex.trim()) {
      // Create HTML node for katex
      const html = `<span class="__se__katex katex" data-exp="${latex.replace(/"/g, '&quot;')}" data-font-size="1em" style="font-size: 1em;">$$${latex}$$</span>&nbsp;`;
      
      // Fix for "Cannot read properties of null (reading 'innerHTML')"
      // The editor needs focus before inserting if the modal took focus away
      try {
        if (editorRef.current.core && editorRef.current.core.focus) {
          editorRef.current.core.focus();
        }
      } catch (e) {
        console.warn("Could not focus suneditor", e);
      }

      editorRef.current.insertHTML(html);
    }
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className} [&_.se-wrapper]:rounded-lg [&_.se-toolbar]:rounded-t-lg [&_.sun-editor]:border-gray-300 [&_.sun-editor]:rounded-lg [&_.sun-editor]:shadow-sm`}>
      <div className="flex justify-end">
        <button 
          onClick={(e) => {
            e.preventDefault();
            setIsMathModalOpen(true);
          }}
          className="flex items-center gap-1 bg-amber-50 text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-md text-xs font-bold border border-amber-200 transition-colors shadow-sm"
          title="Open Visual Math Editor"
        >
          <Calculator className="w-3.5 h-3.5" /> Visual Math 🧮
        </button>
      </div>

      <SunEditor
        getSunEditorInstance={getSunEditorInstance}
        setContents={value}
        onChange={onChange}
        setOptions={{
          height: height,
          minHeight: '100px',
          buttonList: [
            ['undo', 'redo'],
            ['font', 'fontSize', 'formatBlock'],
            ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
            ['removeFormat'],
            ['fontColor', 'hiliteColor'],
            ['align', 'list', 'lineHeight'],
            ['table', 'link', 'image', 'math'],
            ['fullScreen', 'showBlocks', 'codeView']
          ],
          katex: katex,
          imageResizing: true,
          imageHeightShow: true,
          imageWidthShow: true,
          imageSizeOnlyPercentage: false,
          imageRotation: false
        }}
      />

      <VisualMathModal 
        isOpen={isMathModalOpen} 
        onClose={() => setIsMathModalOpen(false)} 
        onInsert={handleInsertMath} 
      />
    </div>
  );
};

