import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, Trash2, Bot, ArrowRight } from 'lucide-react';
import api from '../services/api';

interface NavigationSuggestion {
  label: string;
  route: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: NavigationSuggestion[];
}

const QUICK_QUESTIONS = [
  'How do I file a new claim?',
  'What is the status of my claims?',
  'Tell me about my vehicles and policies',
  'How does the AI damage analysis work?',
];

export function GlobalAIAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/general-chat', { message: text.trim() });
      const suggestions: NavigationSuggestion[] = Array.isArray(res.data.suggestions) ? res.data.suggestions : [];
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply, suggestions }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not process your request. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearHistory = async () => {
    try { await api.delete('/general-chat/history'); } catch { /* silent */ }
    setMessages([]);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all ${
          open ? 'bg-gray-700 hover:bg-gray-600' : 'bg-primary-600 hover:bg-primary-700'
        }`}
        title="AI Assistant"
      >
        {open ? <X className="h-6 w-6 text-white" /> : <MessageSquare className="h-6 w-6 text-white" />}
        {!open && messages.length === 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary-500"></span>
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-42 right-4 lg:bottom-24 lg:right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh', bottom: '5.5rem' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold text-sm">Flash Claim Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={clearHistory} className="p-1 hover:bg-primary-700 rounded" title="Clear history">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-primary-700 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50" style={{ minHeight: '200px', maxHeight: '50vh' }}>
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Bot className="h-10 w-10 text-primary-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-4">Ask me anything about Flash Claim</p>
                <div className="space-y-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="block w-full text-left text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.content}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                      {msg.suggestions.map((s, j) => (
                        <button
                          key={j}
                          onClick={() => { setOpen(false); navigate(s.route); }}
                          className="flex items-center gap-1.5 w-full text-left text-xs px-2.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition"
                        >
                          <ArrowRight className="h-3 w-3 flex-shrink-0" />
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-4 py-2 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
