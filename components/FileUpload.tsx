import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (base64: string, file: File) => void;
  selectedFile?: File | null;
  onClear: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onFileSelect(base64String, file);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerClick = () => {
    fileInputRef.current?.click();
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
        <ImageIcon className="w-4 h-4 text-sky-400" />
        <span className="text-xs text-slate-300 max-w-[150px] truncate">{selectedFile.name}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="hover:bg-slate-700 rounded-full p-0.5"
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <button
        onClick={triggerClick}
        className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-full transition-colors"
        title="Upload Chart Screenshot"
      >
        <Upload className="w-5 h-5" />
      </button>
    </>
  );
};