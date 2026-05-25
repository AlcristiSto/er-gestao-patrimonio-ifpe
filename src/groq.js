const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `Você é um especialista em catalogação patrimonial de instituições federais brasileiras e no sistema CATMAT (Catálogo de Materiais do governo federal).

Sua tarefa: receber uma lista de descrições de bens patrimoniais (como registradas por diferentes campi do IFPE) e retornar um mapeamento padronizado para cada item.

REGRAS:
1. Para cada item, retorne um objeto JSON com os campos:
   - "codigo_catmat": código numérico CATMAT (se reconhecível; se não souber, use "N/D")
   - "nome_padronizado": nome oficial padronizado em português (ex: "MICROCOMPUTADOR")
   - "descricao": breve descrição padronizada (máx 80 chars)
   - "categoria": categoria geral (ex: "Equipamento de TI", "Mobiliário", "Veículo", "Material de Consumo")
   - "confianca": "alta", "media" ou "baixa"

2. Retorne APENAS um array JSON válido, sem markdown, sem texto extra, sem blocos de código.
3. A ordem dos itens no array deve corresponder EXATAMENTE à ordem dos itens de entrada.
4. Seja consistente: itens semanticamente iguais devem ter o mesmo nome_padronizado e codigo_catmat.`;

export async function mapearLote(itens) {
  if (!API_KEY || API_KEY === "sua_chave_aqui") {
    throw new Error("Chave da API não configurada. Verifique o arquivo .env (VITE_GROQ_API_KEY).");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: `Mapeie os seguintes itens:\n${JSON.stringify(itens)}` },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/gi, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("Resposta da IA não é um JSON válido. Tente novamente.");
  }
}
