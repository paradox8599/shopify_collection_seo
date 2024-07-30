import OpenAI from "openai";
import tk from "tiktoken";
import { OPENAI } from "./vars";



export const token = tk.get_encoding("cl100k_base");
let _openai: OpenAI | undefined;
function getOpenAI() {
  _openai ??= new OpenAI({
    baseURL: OPENAI.endpoint?.href,
    apiKey: OPENAI.apiKey,
  });
  return _openai;
}

type GeminiMessage = {
  role: "user";
  content: string;
};

type OpenAIMessage = {
  role: "user" | "system";
  content: string;
};

type ChatMessage = GeminiMessage | OpenAIMessage;

export async function ask({
  prompt,
  instructions = [],
  history = [],
}: {
  history?: ChatMessage[];
  prompt: string;
  instructions?: string[];
}) {
  const inst: OpenAIMessage[] = instructions.map((i) => ({
    role: "system",
    content: i,
  }));
  const chatResult = await getOpenAI().chat.completions.create({
    model: OPENAI.model,
    messages: [...inst, ...history, { role: "user", content: prompt }],
  });
  const finishReason = chatResult.choices[0].finish_reason;
  console.log("\n\nprompt:\n", JSON.stringify(prompt, null, 2));
  console.log("\n\nresult:\n", JSON.stringify(chatResult, null, 2));
  if (finishReason !== "stop") {
    throw `[Completion] Fail reason: "${finishReason}"`;
  }
  const content = chatResult.choices[0].message.content;
  return content?.replaceAll(/```(json)?/g, "").trim();
}

function chunkArray<T>({ arr, size }: { arr: T[]; size: number }) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

export async function askAll({
  prompts,
  instructions,
  chunkSize = 7,
  parser,
}: {
  instructions: string[];
  prompts: object[];
  chunkSize?: number;
  parser?: (resp?: string) => unknown;
}): Promise<unknown[]> {
  const prepared = chunkArray({ arr: prompts, size: chunkSize });
  console.log(
    `${prompts.length} items, into ${prepared.length} chunks of ${chunkSize}`,
  );
  const answers = [];
  for (let i = 0; i < prepared.length; i++) {
    const prompt = prepared[i];
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const a = await ask({ instructions, prompt: JSON.stringify(prompt) });
        const content = parser?.(a) ?? JSON.parse(a ?? "[]");
        answers.push(content);
        break;
      } catch (e) {
        retryCount++;
        console.log(`[Attempt ${retryCount}] ${e}`);
        if (retryCount >= 3) {
          throw new Error(`${e}`);
        }
      }
    }
  }
  return answers;
}

