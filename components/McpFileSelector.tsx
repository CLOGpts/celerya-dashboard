
import React from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface McpFileSelectorProps {
    files: string[];
    onSelect: (fileName: string) => void;
}

const FileIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const McpFileSelector: React.FC<McpFileSelectorProps> = ({ files, onSelect }) => {
    return (
        <div className="flex flex-col items-start gap-2 py-2">
            <div className="max-w-2xl w-full px-4 py-3 rounded-xl shadow-sm bg-white text-gray-800 border border-gray-200">
                {files.length > 0 ? (
                    <>
                        <p className="text-sm font-semibold mb-3">Ho trovato questi file. Quale vuoi analizzare?</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 -mr-2">
                            {files.map(file => (
                                <button
                                    key={file}
                                    onClick={() => onSelect(file)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500"
                                >
                                    <FileIcon />
                                    <span className="text-sm font-medium text-gray-700 truncate">{file}</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                     <div className="flex items-center gap-3 text-sm text-gray-600">
                        <SpinnerIcon className="text-gray-500"/>
                        <span>In attesa dei file dalla cartella condivisa...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default McpFileSelector;