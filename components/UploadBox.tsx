import React, { useState, useCallback } from 'react';
import { UploadCloud, File, X, LoaderCircle } from 'lucide-react';

interface UploadBoxProps {
  title: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onAction: () => void;
  isProcessing: boolean;
  error: string | null;
  description?: string;
  actionButtonText?: string;
}

const UploadBox: React.FC<UploadBoxProps> = ({
  title,
  file,
  onFileChange,
  onAction,
  isProcessing,
  error,
  description = "Trascina qui un file o clicca per selezionarlo.",
  actionButtonText = "Estrai Informazioni"
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileChange(e.dataTransfer.files[0]);
    }
  }, [onFileChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between h-full">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div 
          className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isOver ? 'border-lime-500 bg-lime-50' : 'border-gray-300'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!file ? (
            <>
              <input type="file" id={`file-upload-${title}`} className="hidden" onChange={handleFileSelect} />
              <label htmlFor={`file-upload-${title}`} className="cursor-pointer">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">{description}</p>
                <span className="font-semibold text-lime-600">Sfoglia i file</span>
              </label>
            </>
          ) : (
            <div className="text-left">
              <p className="text-sm font-medium text-gray-500 mb-2">File pronto per l'analisi:</p>
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <File className="h-6 w-6 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => onFileChange(null)} className="p-1 text-gray-500 hover:text-red-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        {file && (
            <button
              onClick={onAction}
              disabled={isProcessing}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? <LoaderCircle className="animate-spin mr-2" /> : null}
              {isProcessing ? 'Analisi in corso...' : actionButtonText}
            </button>
        )}
        {error && (
            <p className="mt-3 text-sm text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>
        )}
      </div>
    </div>
  );
};

export default UploadBox;
