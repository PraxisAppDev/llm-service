import {
  BedrockClient,
  GetFoundationModelCommand,
} from "@aws-sdk/client-bedrock";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockClient();
const runtime = new BedrockRuntimeClient();

const META_LLAMA_33_70B = "meta-llama3.3-70b";
const META_LLAMA_32_3B = "meta-llama3.2-3b";
const META_LLAMA_32_1B = "meta-llama3.2-1b";

export const MODELS = [
  { name: "Llama 3.3 70B Instruct", provider: "Meta", id: META_LLAMA_33_70B },
  { name: "Llama 3.2 3B Instruct", provider: "Meta", id: META_LLAMA_32_3B },
  { name: "Llama 3.2 1B Instruct", provider: "Meta", id: META_LLAMA_32_1B },
];

const MODELS_TO_AWS = new Map<string, string>();
MODELS_TO_AWS.set(META_LLAMA_33_70B, "meta.llama3-3-70b-instruct-v1:0");
MODELS_TO_AWS.set(META_LLAMA_32_3B, "meta.llama3-2-3b-instruct-v1:0");
MODELS_TO_AWS.set(META_LLAMA_32_1B, "meta.llama3-2-1b-instruct-v1:0");

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
  maxGenLen: number
) => {
  const cmd = new InvokeModelCommand({
    modelId: `us.${awsModelId}`,
    body: JSON.stringify({
      prompt: buildLlama3Prompt(system, [{ role: "user", message: prompt }]),
      temperature,
      top_p: topP,
      max_gen_len: maxGenLen,
    }),
    accept: "application/json",
    contentType: "application/json",
  });

  const res = await runtime.send(cmd);

  console.log("BEDROCK InvokeModel:");
  console.dir(res);

  const modelRes = JSON.parse(new TextDecoder().decode(res.body));

  return {
    generation: modelRes.generation as string,
    inputTokens: modelRes.prompt_token_count as number,
    outputTokens: modelRes.generation_token_count as number,
    stopReason: modelRes.stop_reason as "stop" | "length",
  };
};

const getChatCompletion = async (
  awsModelId: string,
  system: string,
  messages: PromptMsg[],
  temperature: number,
  topP: number,
  maxGenLen: number
) => {
  const cmd = new InvokeModelCommand({
    modelId: `us.${awsModelId}`,
    body: JSON.stringify({
      prompt: buildLlama3Prompt(system, messages),
      temperature,
      top_p: topP,
      max_gen_len: maxGenLen,
    }),
    accept: "application/json",
    contentType: "application/json",
  });

  const res = await runtime.send(cmd);

  console.log("BEDROCK InvokeModel:");
  console.dir(res);

  const modelRes = JSON.parse(new TextDecoder().decode(res.body));

  return {
    generation: modelRes.generation as string,
    inputTokens: modelRes.prompt_token_count as number,
    outputTokens: modelRes.generation_token_count as number,
    stopReason: modelRes.stop_reason as "stop" | "length",
  };
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

const START_ID = "<|start_header_id|>";
const END_ID = "<|end_header_id|>";
const END_TURN = "<|eot_id|>";

const buildLlama3Prompt = (system: string, messages: PromptMsg[]) => {
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
