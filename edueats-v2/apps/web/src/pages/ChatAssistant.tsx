import { FormEvent, useMemo, useState } from 'react';
import { Bot, SendHorizontal, Sparkles, User } from 'lucide-react';
import { db } from '../services/api';
import type { ChatbotResponse } from '../types';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: Pick<ChatbotResponse, 'confidence' | 'fallback' | 'modelUsed'>;
};

const welcomeMessage: UiMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hola, soy el asistente de EduEats. Puedo ayudarte con preguntas sobre menu, pedidos, notificaciones y encuestas.',
};

export function ChatAssistant() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<UiMessage[]>([welcomeMessage]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useMemo(() => {
    const key = 'edueats-chat-session';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, created);
    return created;
  }, []);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const content = text.trim();
    if (!content) return;

    const userMessage: UiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setText('');
    setLoading(true);
    setError(null);

    try {
      const response = await db.askChatbot(content, sessionId);
      const assistantMessage: UiMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        meta: {
          confidence: response.confidence,
          fallback: response.fallback,
          modelUsed: response.modelUsed,
        },
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'No fue posible enviar el mensaje.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-200">Asistente EduEats</h1>
            <p className="text-sm text-emerald-700/90 dark:text-emerald-300/90">
              Chatbot adicional para resolver dudas operativas del sistema.
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="h-[52vh] overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/60 dark:bg-gray-900/50">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'ml-auto bg-primary text-white'
                  : 'mr-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 text-xs opacity-85">
                {message.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                <span>{message.role === 'user' ? 'Tú' : 'Asistente'}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>

              {message.role === 'assistant' && message.meta && (
                <p className="mt-2 text-[11px] opacity-75">
                  Modelo: {message.meta.modelUsed} | Confianza: {Math.round((message.meta.confidence ?? 0) * 100)}%
                  {message.meta.fallback ? ' | Respuesta de respaldo' : ''}
                </p>
              )}
            </article>
          ))}

          {loading && (
            <div className="mr-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
              Escribiendo respuesta...
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-3 transition-colors"
            >
              <SendHorizontal size={16} />
              Enviar
            </button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
        </form>
      </div>
    </section>
  );
}