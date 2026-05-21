import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, X, Send, Image as ImageIcon, CheckCircle,
  Bot, RotateCcw, AlertTriangle, Loader2, Trash2, ChevronDown
} from 'lucide-react';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Markdown-lite renderer — bold **text**, newlines, bullet lists
// ---------------------------------------------------------------------------
function RenderMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Bullet list
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.replace(/^[-•]\s/, '');
          return (
            <div key={i} className="flex items-start space-x-1.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
              <span>{renderInline(content)}</span>
            </div>
          );
        }
        // Heading lines (##)
        if (line.startsWith('## ')) {
          return <p key={i} className="font-bold text-sm mt-2">{line.replace('## ', '')}</p>;
        }
        if (line.startsWith('### ')) {
          return <p key={i} className="font-semibold text-xs mt-1.5 uppercase tracking-wide opacity-70">{line.replace('### ', '')}</p>;
        }
        // Horizontal rule
        if (line.trim() === '---') {
          return <hr key={i} className="border-current opacity-20 my-1" />;
        }
        // Empty line
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ msg, onRevert }) {
  const isUser = msg.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm leading-relaxed
        ${isUser
          ? 'bg-indigo-600 text-white rounded-tr-none'
          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
        }
        ${msg.isError ? 'bg-red-50 border-red-200 text-red-700' : ''}
      `}>
        {msg.isImage && (
          <div className="flex items-center space-x-1.5 text-xs opacity-75 mb-1.5">
            <ImageIcon size={12} />
            <span>Image uploaded</span>
          </div>
        )}

        {isUser
          ? <p className="whitespace-pre-wrap">{msg.text}</p>
          : <RenderMarkdown text={msg.text} />
        }

        {/* Revert button for saved records */}
        {msg.revertId && msg.revertType && (
          <button
            onClick={() => onRevert(msg.revertId, msg.revertType, msg.id)}
            className="mt-2 flex items-center space-x-1.5 text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors border border-orange-200 font-semibold"
          >
            <RotateCcw size={11} />
            <span>Undo / Revert this change</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scanned data confirmation card
// ---------------------------------------------------------------------------
function ScannedDataCard({ data, onConfirm, onDiscard, loading }) {
  const [fields, setFields] = useState({ ...data.fields });

  const handleChange = (key, value) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const confidenceColor = {
    high: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    medium: 'text-amber-600 bg-amber-50 border-amber-200',
    low: 'text-red-600 bg-red-50 border-red-200',
  }[data.confidence] || 'text-gray-600 bg-gray-50 border-gray-200';

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl shadow-md p-4 w-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div className="flex items-center space-x-2 text-indigo-700 font-bold">
          <CheckCircle size={16} />
          <span className="text-sm capitalize">{data.record_type} Data Extracted</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${confidenceColor}`}>
          {data.confidence} confidence
        </span>
      </div>

      {data.missing_fields?.length > 0 && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Missing required fields: <strong>{data.missing_fields.join(', ')}</strong>
          </p>
        </div>
      )}

      <div className="space-y-2.5 mb-4">
        {Object.entries(fields).map(([key, val]) => (
          <div key={key}>
            <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">
              {key.replace(/_/g, ' ')}
            </label>
            <input
              type="text"
              value={val ?? ''}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
            />
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onDiscard()}
          disabled={loading}
          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
        >
          <Trash2 size={12} />
          <span>Discard</span>
        </button>
        <button
          onClick={() => onConfirm(data.pending_id, fields)}
          disabled={loading || data.missing_fields?.length > 0}
          className="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
        >
          {loading
            ? <Loader2 size={12} className="animate-spin" />
            : <CheckCircle size={12} />
          }
          <span>{loading ? 'Saving...' : 'Confirm & Save'}</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Chatbot component
// ---------------------------------------------------------------------------
function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [pendingScan, setPendingScan] = useState(null);   // { pending_id, fields, missing_fields, confidence, record_type }
  const [savingConfirm, setSavingConfirm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isScanning, pendingScan]);

  // Load company name from localStorage and set welcome message
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        const name = u?.company?.name || u?.company_name || '';
        setCompanyName(name);
        const botName = name ? `${name} AI Assistant` : 'BizManager AI Assistant';
        setMessages([{
          id: 1,
          type: 'bot',
          text: `Hi! I'm your **${botName}** 🤖\n\nHere's what I can do:\n\n- 📊 **Answer business questions** — ask about sales, profits, stock, customers, suppliers\n- 📸 **Scan images** — upload an invoice or receipt and I'll extract the data for you\n- 🗺️ **Guide you** — ask how to use any feature of the app\n\nI only work with your business data and will always ask for your confirmation before saving anything.\n\nHow can I help you today?`,
        }]);
      }
    } catch (_) {}
  }, []);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  // ---------------------------------------------------------------------------
  // Send chat message
  // ---------------------------------------------------------------------------
  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    addMessage({ type: 'user', text });
    setIsLoading(true);

    try {
      // Build history from current messages (exclude welcome message)
      const history = messages
        .filter(m => m.id !== 1)
        .slice(-10)
        .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text }));

      const { data } = await api.post('/agent/chat', {
        message: text,
        history,
      });

      addMessage({ type: 'bot', text: data.reply });
    } catch (err) {
      const detail = err.response?.data?.detail;
      addMessage({
        type: 'bot',
        isError: true,
        text: detail || '⚠️ Could not reach the AI assistant. Please check your connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handle Enter key (Shift+Enter = newline)
  // ---------------------------------------------------------------------------
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---------------------------------------------------------------------------
  // Image upload & scan
  // ---------------------------------------------------------------------------
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-uploaded
    e.target.value = '';

    addMessage({ type: 'user', isImage: true, text: `📎 ${file.name}` });
    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/agent/scan-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!data.success) {
        // is_wrong_type = report/screenshot — show as info message, not error
        addMessage({
          type: 'bot',
          isError: !data.is_wrong_type,
          text: data.is_wrong_type ? data.message : `⚠️ ${data.message}`,
        });
        return;
      }

      addMessage({ type: 'bot', text: data.message });
      setPendingScan({
        pending_id: data.pending_id,
        fields: data.fields,
        missing_fields: data.missing_fields,
        confidence: data.confidence,
        record_type: data.record_type,
        can_save: data.can_save,
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      addMessage({
        type: 'bot',
        isError: true,
        text: detail || '⚠️ Image scanning failed. Please try a clearer image.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Confirm save scanned data
  // ---------------------------------------------------------------------------
  const handleConfirmSave = async (pendingId, confirmedFields) => {
    setSavingConfirm(true);
    try {
      const { data } = await api.post('/agent/confirm-save', {
        pending_id: pendingId,
        confirmed_data: confirmedFields,
      });

      setPendingScan(null);
      addMessage({
        type: 'bot',
        text: data.message,
        revertId: data.revert_id,
        revertType: data.revert_type,
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      addMessage({
        type: 'bot',
        isError: true,
        text: `⚠️ Save failed: ${detail || 'Unknown error. Please try again.'}`,
      });
    } finally {
      setSavingConfirm(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Discard pending scan
  // ---------------------------------------------------------------------------
  const handleDiscardScan = async () => {
    if (pendingScan?.pending_id) {
      try {
        await api.delete(`/agent/pending/${pendingScan.pending_id}`);
      } catch (_) {}
    }
    setPendingScan(null);
    addMessage({ type: 'bot', text: 'Scan discarded. No data was saved.' });
  };

  // ---------------------------------------------------------------------------
  // Revert a saved record
  // ---------------------------------------------------------------------------
  const handleRevert = async (recordId, recordType, msgId) => {
    if (!window.confirm(`Are you sure you want to revert this ${recordType}? This cannot be undone.`)) return;

    try {
      const { data } = await api.post('/agent/revert', {
        record_id: recordId,
        record_type: recordType,
      });

      // Remove the revert button from the original message
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, revertId: null, revertType: null } : m
      ));
      addMessage({ type: 'bot', text: data.message });
    } catch (err) {
      const detail = err.response?.data?.detail;
      addMessage({
        type: 'bot',
        isError: true,
        text: `⚠️ Revert failed: ${detail || 'Unknown error.'}`,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Clear chat
  // ---------------------------------------------------------------------------
  const handleClearChat = () => {
    const botName = companyName ? `${companyName} AI Assistant` : 'BizManager AI Assistant';
    setMessages([{
      id: Date.now(),
      type: 'bot',
      text: `Chat cleared. I'm your **${botName}** — how can I help you?`,
    }]);
    setPendingScan(null);
  };

  const unreadCount = 0; // Could track unread if needed

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label="Toggle AI Assistant"
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center
          ${isOpen
            ? 'bg-gray-800 text-white scale-90'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-110 hover:shadow-indigo-500/40'
          }`}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Chat window */}
      <div
        className={`fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100
          flex flex-col overflow-hidden transition-all duration-300 z-50 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
        style={{ height: '560px', maxHeight: 'calc(100vh - 130px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center text-white space-x-3 flex-shrink-0">
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm flex-shrink-0">
            <Bot size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm leading-tight truncate">
              {companyName ? `${companyName} Assistant` : 'AI Assistant'}
            </h3>
            <p className="text-xs text-indigo-200">Ask questions · Scan images · Get help</p>
          </div>
          <button
            onClick={handleClearChat}
            title="Clear chat"
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50/40">
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} onRevert={handleRevert} />
          ))}

          {/* Scanning indicator */}
          {isScanning && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 size={14} className="animate-spin text-indigo-500" />
                  <span className="text-xs font-semibold text-gray-600">Scanning image with Mistral AI...</span>
                </div>
                <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full animate-pulse w-2/3" />
                </div>
              </div>
            </div>
          )}

          {/* Pending scan confirmation card */}
          {pendingScan && !isScanning && (
            <div className="flex justify-start w-full">
              <ScannedDataCard
                data={pendingScan}
                onConfirm={handleConfirmSave}
                onDiscard={handleDiscardScan}
                loading={savingConfirm}
              />
            </div>
          )}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 p-3 bg-white border-t border-gray-100">
          <div className="flex items-end space-x-2 bg-gray-50 border border-gray-200 rounded-2xl px-2 py-1.5
            focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all shadow-inner">
            {/* Image upload button */}
            <label
              title="Upload image to scan"
              className="p-1.5 text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors rounded-xl hover:bg-indigo-50 flex-shrink-0 self-end mb-0.5"
            >
              <ImageIcon size={18} />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={isLoading || isScanning}
              />
            </label>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your business..."
              rows={1}
              disabled={isLoading || isScanning}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-800 placeholder-gray-400 resize-none py-1 max-h-24 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isScanning}
              className={`p-2 rounded-xl transition-all flex-shrink-0 self-end mb-0.5
                ${input.trim() && !isLoading && !isScanning
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20'
                  : 'text-gray-300 cursor-not-allowed'
                }`}
            >
              {isLoading
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>

          <p className="text-center mt-1.5 text-[10px] text-gray-400 font-medium tracking-widest uppercase">
            Powered by Mistral · Ollama Cloud
          </p>
        </div>
      </div>
    </>
  );
}

export default Chatbot;
