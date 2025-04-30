import { authorizeTokenOrBearer } from "../auth";
import { responseTypes } from "../common";
import { llm } from "../llm";
import { ChatRequest, CompletionRequest } from "../schemas";

export const completion = async (req: CompletionRequest, token?: string, bearer?: string) => {
  const awsModelId = llm.getAwsModelId(req.model);
  if (!awsModelId) {
    return {
      error: {
        error: responseTypes.not_found,
        messages: [`Unknown model identifier "${req.model}"`],
      },
      errorStatus: 404 as 404,
    };
  }

  const auth = await authorizeTokenOrBearer(token, bearer);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  console.info(`Completion request: ${req.system.length} system, ${req.prompt.length} prompt`);

  let gen = await llm.getCompletion(
    awsModelId,
    req.system,
    req.prompt,
    req.temperature,
    req.topP,
    req.maxGenLen
  );

  console.info(
    `Completion response: ${gen.inputTokens} input tokens, ${gen.outputTokens} output tokens`
  );

  return {
    completion: {
      model: req.model,
      generation: gen.generation,
      stopReason: gen.stopReason,
      usage: {
        inputTokens: gen.inputTokens,
        outputTokens: gen.outputTokens,
      },
    },
  };
};

export const chatCompletion = async (req: ChatRequest, token?: string, bearer?: string) => {
  const awsModelId = llm.getAwsModelId(req.model);
  if (!awsModelId) {
    return {
      error: {
        error: responseTypes.not_found,
        messages: [`Unknown model identifier "${req.model}"`],
      },
      errorStatus: 404 as 404,
    };
  }

  const auth = await authorizeTokenOrBearer(token, bearer);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  console.info(
    `Chat request: ${req.system.length} system, ${
      req.messages.length
    } messages, ${req.messages.reduce((acc, m) => acc + m.message.length, 0)} prompt`
  );

  let gen = await llm.getChatCompletion(
    awsModelId,
    req.system,
    req.messages,
    req.temperature,
    req.topP,
    req.maxGenLen
  );

  console.info(`Chat response: ${gen.inputTokens} input tokens, ${gen.outputTokens} output tokens`);

  return {
    completion: {
      model: req.model,
      generation: gen.generation,
      stopReason: gen.stopReason,
      usage: {
        inputTokens: gen.inputTokens,
        outputTokens: gen.outputTokens,
      },
    },
  };
};
