const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

function getKeys(): string[] {
  return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean) as string[];
}

function isRetryable(msg: string): boolean {
  return /high demand|overloaded|unavailable|503|UNAVAILABLE|quota|rate.?limit|429/i.test(msg);
}

interface GeminiOpts {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

async function callClaude(prompt: string, system: string | undefined, maxTokens: number, temperature = 0.9): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const body: any = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;
  if (temperature !== undefined) body.temperature = temperature;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) return (data.content?.[0]?.text ?? "").trim();
    const msg: string = data.error?.message ?? `Anthropic error ${res.status}`;
    if (attempt < 2 && /overload|529/i.test(msg)) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }
    throw new Error(msg);
  }
  throw new Error("Claude indisponível");
}

async function callGemini(contents: object[], opts: GeminiOpts): Promise<string> {
  const keys = getKeys();
  if (!keys.length) throw new Error("Nenhuma GEMINI_API_KEY configurada");

  const { system, maxTokens = 4096, temperature = 0.9 } = opts;
  let lastError = "Gemini indisponível";

  for (const model of GEMINI_MODELS) {
    const shuffled = [...keys].sort(() => Math.random() - 0.5);
    for (const key of shuffled) {
      const body: any = {
        contents,
        generationConfig: { temperature, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
      };
      if (system) body.systemInstruction = { parts: [{ text: system }] };

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        );
        const data = await res.json();
        if (!res.ok) {
          const msg: string = data.error?.message ?? `Gemini error ${res.status}`;
          lastError = msg;
          if (isRetryable(msg)) continue;
          throw new Error(msg);
        }
        const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (!text) { lastError = "Resposta vazia"; continue; }
        return text;
      } catch (e: any) {
        lastError = e.message ?? lastError;
        if (!isRetryable(lastError)) throw e;
      }
    }
  }

  throw new Error(lastError);
}

export async function geminiText(prompt: string, opts: GeminiOpts = {}): Promise<string> {
  const { system, maxTokens = 4096, temperature = 0.9 } = opts;

  // 1. OpenAI GPT-4o (principal)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const messages: any[] = [];
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: prompt });
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: maxTokens, temperature }),
      });
      const data = await res.json();
      if (res.ok) return (data.choices?.[0]?.message?.content ?? "").trim();
      console.warn("[geminiText] OpenAI falhou:", data.error?.message);
    } catch (e: any) {
      console.warn("[geminiText] OpenAI erro:", e.message);
    }
  }

  // 2. Gemini (fallback)
  try {
    return await callGemini([{ parts: [{ text: prompt }] }], opts);
  } catch (e: any) {
    console.warn("[geminiText] Gemini falhou, tentando Claude...", e.message);
  }

  // 3. Claude (último recurso)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await callClaude(prompt, system, maxTokens, temperature);
    } catch (e: any) {
      console.warn("[geminiText] Claude falhou:", e.message);
    }
  }

  throw new Error("Todos os serviços de IA indisponíveis. Tente novamente.");
}

export async function geminiVision(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  opts: GeminiOpts = {}
): Promise<string> {
  // Visão só funciona no Gemini — sem fallback para Claude aqui
  return callGemini(
    [{ parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }] }],
    opts
  );
}
