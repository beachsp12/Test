import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, OfferFields, ExtractResponse } from '../types';
import { extract } from '../api';

interface Props {
  onExtraction: (result: ExtractResponse) => void;
  existingFields?: OfferFields;
  disabled?: boolean;
}

export default function ChatInput({ onExtraction, existingFields, disabled }: Props) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);
    setError(null);

    // Optimistically add user message to display
    const userMsg: ChatMessage = { role: 'user', content: text };
    setHistory(prev => [...prev, userMsg]);

    try {
      const response = await extract(text, history, existingFields);
      setHistory(response.conversationHistory);
      onExtraction(response);
    } catch (err) {
      setError('Failed to extract fields. Check that the backend is running and ANTHROPIC_API_KEY is set.');
      setHistory(prev => prev.slice(0, -1)); // remove optimistic user message on error
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[380px]">
        {history.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Describe the offer in plain language.</p>
            <p className="text-xs mt-1 text-gray-300">
              e.g. "We're offering $875K on 42 Maple St in Newton, 20% down, conventional, 45-day close, with financing and inspection contingencies."
            </p>
          </div>
        )}
        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' && (
                <span className="block text-xs font-semibold text-brand-600 mb-1">
                  GBBREB Assistant
                </span>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            rows={2}
            placeholder="Describe the offer… (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                       placeholder-gray-400 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={disabled || loading || !input.trim()}
            className="btn-primary h-10 px-4 rounded-xl shrink-0"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 pl-1">
          The assistant will ask follow-up questions until all required fields are captured.
        </p>
      </div>
    </div>
  );
}
