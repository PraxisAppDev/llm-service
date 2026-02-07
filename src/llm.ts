import { BedrockClient, GetFoundationModelCommand } from "@aws-sdk/client-bedrock";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockClient();
const runtime = new BedrockRuntimeClient();

const META_LLAMA_4M_17B = "meta-llama4-maverick-17b";
const META_LLAMA_4S_17B = "meta-llama4-scout-17b";
const META_LLAMA_33_70B = "meta-llama3.3-70b";
const META_LLAMA_32_11B = "meta-llama3.2-11b";
const META_LLAMA_32_3B = "meta-llama3.2-3b";
const META_LLAMA_32_1B = "meta-llama3.2-1b";

const OPENAI_GPT_OSS_20B = "openai-gpt-oss-20b";
const OPENAI_GPT_OSS_120B = "openai-gpt-oss-120b";

export const MODELS = [
  { name: "Llama 4 Maverick 17B Instruct", provider: "Meta", id: META_LLAMA_4M_17B },
  { name: "Llama 4 Scout 17B Instruct", provider: "Meta", id: META_LLAMA_4S_17B },
  { name: "Llama 3.3 70B Instruct", provider: "Meta", id: META_LLAMA_33_70B },
  { name: "Llama 3.2 11B Instruct", provider: "Meta", id: META_LLAMA_32_11B },
  { name: "Llama 3.2 3B Instruct", provider: "Meta", id: META_LLAMA_32_3B },
  { name: "Llama 3.2 1B Instruct", provider: "Meta", id: META_LLAMA_32_1B },
  { name: "GPT OSS 20B", provider: "OpenAI", id: OPENAI_GPT_OSS_20B },
  { name: "GPT OSS 120B", provider: "OpenAI", id: OPENAI_GPT_OSS_120B },
];

const MODELS_TO_AWS = new Map<string, string>();
MODELS_TO_AWS.set(META_LLAMA_4M_17B, "us.meta.llama4-maverick-17b-instruct-v1:0");
MODELS_TO_AWS.set(META_LLAMA_4S_17B, "us.meta.llama4-scout-17b-instruct-v1:0");
MODELS_TO_AWS.set(META_LLAMA_33_70B, "us.meta.llama3-3-70b-instruct-v1:0");
MODELS_TO_AWS.set(META_LLAMA_32_11B, "us.meta.llama3-2-11b-instruct-v1:0");
MODELS_TO_AWS.set(META_LLAMA_32_3B, "us.meta.llama3-2-3b-instruct-v1:0");
MODELS_TO_AWS.set(META_LLAMA_32_1B, "us.meta.llama3-2-1b-instruct-v1:0");
MODELS_TO_AWS.set(OPENAI_GPT_OSS_20B, "openai.gpt-oss-20b-1:0");
MODELS_TO_AWS.set(OPENAI_GPT_OSS_120B, "openai.gpt-oss-120b-1:0");

const getAwsModelId = (modelId: string) => MODELS_TO_AWS.get(modelId);

const getModel = async (awsModelId: string) => {
  const cmd = new GetFoundationModelCommand({
    modelIdentifier: awsModelId,
  });

  const res = await client.send(cmd);

  console.log("BEDROCK GetModel:");
  console.dir(res);

  if (!res.modelDetails) {
    return null;
  } else {
    return {
      id: res.modelDetails.modelId as string,
      name: res.modelDetails.modelName as string,
      provider: res.modelDetails.providerName as string,
      inputModalities: res.modelDetails.inputModalities as string[],
      outputModalities: res.modelDetails.outputModalities as string[],
    };
  }
};

const getCompletion = async (
  awsModelId: string,
  system: string,
  prompt: string,
  temperature: number,
  topP: number,
  maxGenLen: number,
) => {
  const cmd = new InvokeModelCommand({
    modelId: awsModelId,
    body: JSON.stringify(
      buildReqBody(
        awsModelId,
        system,
        [{ role: "user", message: prompt }],
        temperature,
        topP,
        maxGenLen,
      ),
    ),
    accept: "application/json",
    contentType: "application/json",
  });

  const res = await runtime.send(cmd);

  console.log("BEDROCK InvokeModel:");
  console.dir(res);

  const modelRes = JSON.parse(new TextDecoder().decode(res.body));

  return handleResponse(awsModelId, modelRes);
};

const getChatCompletion = async (
  awsModelId: string,
  system: string,
  messages: PromptMsg[],
  temperature: number,
  topP: number,
  maxGenLen: number,
) => {
  const cmd = new InvokeModelCommand({
    modelId: awsModelId,
    body: JSON.stringify(buildReqBody(awsModelId, system, messages, temperature, topP, maxGenLen)),
    accept: "application/json",
    contentType: "application/json",
  });

  const res = await runtime.send(cmd);

  console.log("BEDROCK InvokeModel:");
  console.dir(res);

  const modelRes = JSON.parse(new TextDecoder().decode(res.body));

  return handleResponse(awsModelId, modelRes);
};

export const llm = {
  getAwsModelId,
  getModel,
  getCompletion,
  getChatCompletion,
};

type PromptMsg = {
  role: "user" | "assistant";
  message: string;
};

const buildReqBody = (
  awsModelId: string,
  system: string,
  messages: PromptMsg[],
  temperature: number,
  topP: number,
  maxGenLen: number,
) => {
  if (awsModelId.startsWith("us.meta")) {
    return buildLlamaReqBody(system, messages, temperature, topP, maxGenLen);
  } else {
    const body = buildOpenAiReqBody(awsModelId, system, messages, temperature, topP, maxGenLen);
    console.log("OPENAI Request Body:", body);
    return body;
  }
};

const buildLlamaReqBody = (
  system: string,
  messages: PromptMsg[],
  temperature: number,
  topP: number,
  maxGenLen: number,
) => {
  return {
    prompt: buildLlamaPrompt(system, messages),
    temperature,
    top_p: topP,
    max_gen_len: maxGenLen,
  };
};
const START_ID = "<|start_header_id|>";
const END_ID = "<|end_header_id|>";
const END_TURN = "<|eot_id|>";

const buildLlamaPrompt = (system: string, messages: PromptMsg[]) => {
  let prompt = "<|begin_of_text|>";

  // system
  prompt += `${START_ID}system${END_ID}\n\n${system}${END_TURN}`;

  // add all messages
  for (const msg of messages) {
    prompt += `${START_ID}${msg.role}${END_ID}\n\n${msg.message}${END_TURN}`;
  }

  prompt += `${START_ID}assistant${END_ID}`;

  return prompt;
};

type OpenAiMsg = {
  role: "user" | "assistant" | "system";
  content: string;
};

const buildOpenAiReqBody = (
  awsModelId: string,
  system: string,
  messages: PromptMsg[],
  temperature: number,
  topP: number,
  maxGenLen: number,
) => {
  const oaiMessages: OpenAiMsg[] = [
    { role: "system", content: system },
    ...messages.map((msg) => ({ role: msg.role, content: msg.message })),
  ];

  return {
    messages: oaiMessages,
    temperature,
    top_p: topP,
    max_completion_tokens: maxGenLen,
  };
};

const handleResponse = (awsModelId: string, body: object) => {
  if (awsModelId.startsWith("us.meta")) {
    return handleLlamaResponse(body);
  } else {
    return handleOpenAiResponse(body);
  }
};

const handleLlamaResponse = (body: any) => {
  return {
    generation: body.generation as string,
    inputTokens: body.prompt_token_count as number,
    outputTokens: body.generation_token_count as number,
    stopReason: body.stop_reason as "stop" | "length",
  };
};

const handleOpenAiResponse = (body: any) => {
  return {
    generation: body.choices[0].message.content as string,
    inputTokens: body.usage.prompt_tokens as number,
    outputTokens: body.usage.completion_tokens as number,
    stopReason: body.choices[0].finish_reason as "stop" | "length" | "content_filter",
  };
};
