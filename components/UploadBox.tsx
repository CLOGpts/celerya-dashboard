import React, { useState, useCallback, useRef } from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';

const UploadIcon: React.FC = () => (
    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const FileIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

interface UploadBoxProps {
    title: string;
    description: string;
    actionButtonText: string;
    file: File | null;
    isProcessing: boolean;
    onFileChange: (file: File | null) => void;
    onAction: () => void;
    error: string | null;
    acceptedFileTypes: string;
    idPrefix: string;
}

const UploadBox: React.FC<UploadBoxProps> = ({
    title,
    description,
    actionButtonText,
    file,
    isProcessing,
    onFileChange,
    onAction,
    error,
    acceptedFileTypes,
    idPrefix
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((selectedFile: File | null) => {
        onFileChange(selectedFile);
    }, [onFileChange]);

    const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) { handleFile(e.dataTransfer.files[0]); e.dataTransfer.clearData(); } }, [handleFile]);
    const onFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); };
    const onUploadButtonClick = () => { fileInputRef.current?.click(); };
    const onRemoveFileClick = () => { handleFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
    
    const handleDropzoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            
            {!file ? (
                <>
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                    <div 
                        onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
                        onClick={onUploadButtonClick}
                        onKeyDown={handleDropzoneKeyDown}
                        role="button"
                        tabIndex={0}
                        aria-label={title}
                        className={`mt-6 border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors flex-grow flex flex-col justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 ${isDragging ? 'border-lime-500 bg-lime-50' : 'border-gray-300 hover:border-lime-400'}`}
                    >
                        <UploadIcon />
                        <p className="mt-2 text-sm text-gray-600 pointer-events-none">
                            <span className="font-medium text-lime-600">
                                Carica un file
                            </span>
                            {' '}o trascinalo qui
                        </p>
                        <p className="mt-1 text-xs text-gray-500 pointer-events-none">PDF, DOCX, JPG, PNG fino a 10MB</p>
                        <input type="file" ref={fileInputRef} onChange={onFileSelectChange} className="hidden" accept={acceptedFileTypes} id={`${idPrefix}-file-input`} />
                    </div>
                </>
            ) : (
                <div className="mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200 flex-grow flex flex-col justify-center">
                    <h3 className="text-base font-medium text-gray-600 mb-4">File pronto per l'analisi:</h3>
                     <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                        <div className="flex items-center gap-4 min-w-0">
                           <FileIcon />
                            <div className="flex-grow min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button onClick={onRemoveFileClick} disabled={isProcessing} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full flex-shrink-0 disabled:opacity-50" aria-label="Rimuovi file">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <button onClick={onAction} disabled={isProcessing} className="w-full mt-6 px-4 py-2.5 bg-lime-600 text-white font-semibold rounded-lg hover:bg-lime-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 disabled:bg-lime-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                       {isProcessing && <SpinnerIcon className="text-white" />}
                       {isProcessing ? 'Analisi in corso...' : actionButtonText}
                    </button>
                </div>
            )}
             {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}
        </div>
    );
};

export default UploadBox;