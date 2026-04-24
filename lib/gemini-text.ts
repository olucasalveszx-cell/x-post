const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"];

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

async function callClaude(prompt: string, system: string | undefined, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const body: any = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Anthropic error ${res.status}`);
  return (data.content?.[0]?.text ?? "").trim();
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

  // Fallback: Claude Haiku quando todos os modelos Gemini estão sobrecarregados
  const textPrompt = (contents[0] as any)?.parts?.find((p: any) => p.text)?.text ?? "";
  return callClaude(textPrompt, system, maxTokens);
}

export async function geminiText(prompt: string, opts: GeminiOpts = {}): Promise<string> {
  return callGemini([{ parts: [{ text: prompt }] }], opts);
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
