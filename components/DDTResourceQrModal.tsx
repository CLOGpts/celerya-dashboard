import React, { useState, useEffect } from 'react';
import type { DDT, Supplier } from '../types';
import QRCode from 'qrcode';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplierId: string, ddtId: string, qrCodeUrl: string) => void;
    data: DDT;
    supplier: Supplier | null;
}

const DDTResourceQrModal: React.FC<Props> = ({ isOpen, onClose, onSave, data, supplier }) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const resourceUrl = `https://celerya.app/resource/ddt/${data.id}`;

    useEffect(() => {
        if (isOpen) {
            QRCode.toDataURL(resourceUrl, { width: 256, margin: 2 })
                .then(url => setQrCodeDataUrl(url))
                .catch(err => console.error('Failed to generate QR code', err));
        }
    }, [isOpen, resourceUrl]);

    if (!isOpen || !supplier) return null;

    const handleSave = () => {
        // --- MODIFICA CHIAVE ---
        onSave(supplier.id, data.id, resourceUrl);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full text-center">
                <h2 className="text-2xl font-bold text-gray-800">Crea Risorsa QR per DDT</h2>
                <p className="text-gray-500 mt-2 mb-6">Stai per creare un link per il DDT N°: <br /><span className="font-semibold text-gray-700">{data.numeroDocumento}</span></p>
                {qrCodeDataUrl && ( <div className="flex flex-col items-center gap-4"><img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48 border-4 rounded-lg" /><input type="text" readOnly value={resourceUrl} className="w-full p-2 border rounded-md text-center bg-gray-50 font-mono text-sm"/></div> )}
                <div className="mt-8 flex gap-4">
                    <button onClick={onClose} className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Annulla</button>
                    <button onClick={handleSave} className="w-full px-4 py-2 bg-lime-600 text-white font-semibold rounded-lg hover:bg-lime-700">Salva e Associa</button>
                </div>
            </div>
        </div>
    );
};
export default DDTResourceQrModal;
