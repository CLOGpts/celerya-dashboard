import React, { useState, useEffect } from 'react';
import type { Product, Alert, Section } from '../types';
import PdfContent from './PdfContent';
import * as QRCode from 'qrcode';

interface DocumentViewerProps {
    product: Product & { qrCodeUrl?: string };
    alerts: Alert[];
    schema: Section[];
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ product, alerts, schema }) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [isLoadingQr, setIsLoadingQr] = useState(true);

    useEffect(() => {
        if (product.qrCodeUrl) {
            QRCode.toDataURL(product.qrCodeUrl, { width: 96, margin: 1 })
                .then(url => {
                    setQrCodeDataUrl(url);
                })
                .catch(err => {
                    console.error("Failed to generate QR code for viewer", err);
                })
                .finally(() => {
                    setIsLoadingQr(false);
                });
        } else {
            setIsLoadingQr(false);
        }
    }, [product.qrCodeUrl]);

    return (
        <div className="bg-gray-100 min-h-screen p-2 sm:p-4 md:p-8">
             <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg print:shadow-none">
                <PdfContent 
                    data={product} 
                    alerts={alerts} 
                    schema={schema} 
                    qrCodeDataUrl={qrCodeDataUrl ?? undefined} 
                />
            </div>
             <div className="max-w-4xl mx-auto mt-4 text-center">
                <button 
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 print:hidden"
                >
                    Stampa o Salva come PDF
                </button>
            </div>
        </div>
    );
};

export default DocumentViewer;