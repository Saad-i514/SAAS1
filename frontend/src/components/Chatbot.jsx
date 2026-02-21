import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Image as ImageIcon, CheckCircle, Bot } from 'lucide-react';

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: 'Hi there! Im your AI Assistant. You can chat with me or upload an invoice/receipt to scan it.' }
    ]);
    const [input, setInput] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isScanning, scannedData]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setMessages([...messages, { id: Date.now(), type: 'user', text: input }]);
        const currentInput = input;
        setInput('');

        // Mock response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'bot',
                text: `I understand you're asking about "${currentInput}". Note: AI backend is mock only.`
            }]);
        }, 1000);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMessages([...messages, {
            id: Date.now(),
            type: 'user',
            isImage: true,
            text: `Uploaded: ${file.name}`
        }]);

        setIsScanning(true);

        // Simulate OCR Scan
        setTimeout(() => {
            setIsScanning(false);
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'bot',
                text: 'I extracted the following data from your document. Would you like to add it as a new Supplier?'
            }]);
            setScannedData({
                supplier_no: 'SUP-991',
                name: 'Nexus Tech Global',
                email: 'billing@nexustech.io',
                phone: '+1-555-0198'
            });
        }, 2500);
    };

    const handleConfirmData = () => {
        setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            text: '✅ Data confirmed! Note: Integration with backend required for actual saving.'
        }]);
        setScannedData(null);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center ${isOpen ? 'bg-gray-800 text-white transform scale-90' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-110 hover:shadow-indigo-500/50'}`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-300 z-50 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`} style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}>

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center text-white space-x-3">
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold">AI Assistant</h3>
                        <p className="text-xs text-indigo-100">Database Chat & OCR Scanner</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${msg.type === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}>
                                {msg.isImage && <div className="flex items-center space-x-2 text-sm opacity-90 mb-1"><ImageIcon size={14} /><span>Image attachment</span></div>}
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}

                    {isScanning && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-100 text-gray-800 rounded-2xl p-4 shadow-sm rounded-tl-none flex flex-col items-center space-y-3">
                                <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full bg-indigo-500 w-1/3 animate-[scan_1.5s_ease-in-out_infinite_alternate]"></div>
                                </div>
                                <p className="text-xs text-gray-500 font-medium">Extracting text via OCR...</p>
                            </div>
                        </div>
                    )}

                    {scannedData && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-indigo-100 rounded-2xl shadow-md p-4 w-full">
                                <div className="flex items-center space-x-2 text-indigo-600 font-bold mb-3 border-b pb-2">
                                    <CheckCircle size={18} />
                                    <span className="text-sm">Extracted Data</span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    {Object.entries(scannedData).map(([k, v]) => (
                                        <div key={k}>
                                            <label className="text-xs uppercase text-gray-500 font-bold mb-1 block tracking-wider">{k.replace('_', ' ')}</label>
                                            <input
                                                type="text"
                                                value={v}
                                                onChange={(e) => setScannedData({ ...scannedData, [k]: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-sm focus:ring-1 outline-none transition-all focus:border-indigo-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleConfirmData}
                                    className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Confirm & Save
                                </button>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100">
                    <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-full px-2 py-1 shadow-inner focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
                        <label className="p-2 text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors rounded-full hover:bg-indigo-50">
                            <ImageIcon size={20} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything..."
                            className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 text-gray-800"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className={`p-2 rounded-full transition-colors ${input.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'text-gray-400'}`}
                        >
                            <Send size={18} className={input.trim() ? 'ml-0.5' : ''} />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">AI Powered Management</span>
                    </div>
                </form>
            </div>
        </>
    );
}

export default Chatbot;
