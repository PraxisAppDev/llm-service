import { authorizeTokenOrBearer } from "../auth";
import { responseTypes } from "../common";
import { llm, MODELS } from "../llm";

export const listModels = async (token?: string, bearer?: string) => {
  const auth = await authorizeTokenOrBearer(token, bearer);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  return {
    models: MODELS,
  };
};

export const getModel = async (modelId: string, token?: string, bearer?: string) => {
  const awsModelId = llm.getAwsModelId(modelId);
  if (!awsModelId) {
    return {
      error: {
        error: responseTypes.not_found,
        messages: [`Unknown model identifier "${modelId}"`],
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

  const model = await llm.getModel(awsModelId);

  if (model) {
    return {
      model: { ...model, id: modelId },
    };
  } else {
    console.error(`Get model returned no result for "${awsModelId}"!`);
    return {
      error: {
        error: responseTypes.server_error,
        messages: ["Model retrieval failed"],
      },
      errorStatus: 500 as 500,
    };
  }
};
