import { Router } from 'express';
import { z } from 'zod';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  sessionId: z.string().trim().min(1).max(120).optional(),
});

const rateWindowMs = 60_000;
const maxPerWindow = Number(process.env.CHATBOT_RATE_LIMIT_PER_MINUTE ?? 10);
const ipBuckets = new Map<string, number[]>();

const defaultSystemPrompt =
  'Eres el asistente de EduEats. Responde breve y claro en espanol. Si no tienes datos exactos, dilo sin inventar.';

const fallbackKnowledge = [
  {
    test: /horario|menu|almuerzo/i,
    answer:
      'Puedes revisar el menu del dia en la seccion Mi Semana o en Planificador de Menu si eres admin.',
  },
  {
    test: /encuesta|pqr|sugerencia|queja|reclamo/i,
    answer:
      'Las encuestas y PQR estan disponibles en la seccion Calificar Servicio para estudiantes y en Encuestas y PQR para administracion.',
  },
  {
    test: /pedido|orden/i,
    answer:
      'Para hacer un pedido, entra a Mi Semana y selecciona el dia disponible. El sistema valida categorias y disponibilidad.',
  },
];

function sanitizeInput(text: string) {
  return text.replace(/<\|.*?\|>/g, '').replace(/SYSTEM:/gi, '').replace(/IGNORE PREVIOUS/gi, '').trim();
}

function withinRateLimit(ip: string) {
  const now = Date.now();
  const existing = ipBuckets.get(ip) ?? [];
  const recent = existing.filter((t) => now - t < rateWindowMs);

  if (recent.length >= maxPerWindow) {
    ipBuckets.set(ip, recent);
    return false;
  }

  recent.push(now);
  ipBuckets.set(ip, recent);
  return true;
}

function resolveCompletionsUrl() {
  const endpoint = (process.env.CHATBOT_LLM_ENDPOINT ?? 'https://api.openai.com/v1').trim();
  if (endpoint.endsWith('/chat/completions')) return endpoint;
  return `${endpoint.replace(/\/+$/, '')}/chat/completions`;
}

async function askLlm(messages: ChatMessage[]) {
  const apiKey = process.env.CHATBOT_API_KEY?.trim();
  if (!apiKey) return null;

  const model = (process.env.CHATBOT_LLM_MODEL ?? 'gpt-4o-mini').trim();
  const response = await fetch(resolveCompletionsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 400,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  return {
    answer: content,
    modelUsed: model,
  };
}

function fallbackAnswer(question: string) {
  const hit = fallbackKnowledge.find((item) => item.test.test(question));
  return (
    hit?.answer ??
    process.env.CHATBOT_FALLBACK_MSG?.trim() ??
    'No encontre informacion exacta en este momento. Intenta con otra pregunta sobre menu, pedidos o encuestas.'
  );
}

export const chatbotRouter = Router();

chatbotRouter.post('/', async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload invalido' });
  }

  const requesterIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!withinRateLimit(requesterIp)) {
    return res.status(429).json({ error: 'Rate limit excedido' });
  }

  const userMessage = sanitizeInput(parsed.data.message);
  if (!userMessage) {
    return res.status(400).json({ error: 'Mensaje vacio' });
  }

  const systemPrompt = process.env.CHATBOT_SYSTEM_PROMPT?.trim() || defaultSystemPrompt;
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    const llmResult = await askLlm(messages);
    if (llmResult) {
      return res.json({
        answer: llmResult.answer,
        sources: [{ id: 'llm', title: 'Asistente EduEats', confidence: 0.9 }],
        confidence: 0.9,
        fallback: false,
        modelUsed: llmResult.modelUsed,
      });
    }
  } catch (error) {
    console.error('[chatbot] LLM call failed:', error);
  }

  return res.json({
    answer: fallbackAnswer(userMessage),
    sources: [{ id: 'fallback', title: 'Base de ayuda interna', confidence: 0.55 }],
    confidence: 0.55,
    fallback: true,
    modelUsed: 'fallback',
  });
});