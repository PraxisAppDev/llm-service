import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { formatISO, fromUnixTime, getUnixTime } from "date-fns";
import { Resource } from "sst";
import { AdminUser, InternalApiKey, User, UserApiKey, UserWithKeys } from "./schemas";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME: string = Resource.Data.name;
const ALL_USER_INDEX: string = "AllUserIdx";
const ADMIN_SESSION_INDEX: string = "AdminSessionIdx";

const SEP = "#";
const PREFIX_AUTH = "Auth";
const PREFIX_SESSION = "Session";
const PREFIX_USER = "ApiUser";
const PREFIX_USER_KEY = `${PREFIX_USER}Key`;

const mkAuthId = (email: string) => `${PREFIX_AUTH}${SEP}${email}`;
const mkSessionId = (token: string) => `${PREFIX_SESSION}${SEP}${token}`;
const mkUserId = (email: string) => `${PREFIX_USER}${SEP}${email}`;
const mkUserKeyId = (keyId: string) => `${PREFIX_USER_KEY}${SEP}${keyId}`;

// ADMINS --------

const dynamoToAdminUser = (item: Record<string, any>) => {
  const user: AdminUser = {
    id: item.userId as string,
    email: (item.recordId as string).split(SEP)[1],
    name: item.userName as string,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
  return { user, passwordHash: item.passwordHash as string };
};

const createAdminUser = async (user: AdminUser, passwordHash: string) => {
  const cmd = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      userId: user.id,
      recordId: mkAuthId(user.email),
      userName: user.name,
      passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });

  await client.send(cmd);
  console.log(`Created new admin user: ${user.id} -> ${user.email}`);
};

// const updateAdminUser = async (user: AdminUser, passwordHash: string) => {
//   const cmd = new UpdateCommand({
//     TableName: TABLE_NAME,
//     Key: {
//       userId: user.id,
//       recordId: mkAuthId(user.email),
//     },
//     UpdateExpression:
//       "SET recordId = :recordId, userName = :name, updatedAt = :updatedAt, passwordHash = :passwordHash",
//     ExpressionAttributeValues: {
//       ":recordId": mkAuthId(user.email),
//       ":name": user.name,
//       ":updatedAt": user.updatedAt,
//       ":passwordHash": passwordHash,
//     },
//     ReturnValues: "ALL_NEW",
//   });

//   const response = await client.send(cmd);
//   console.log("Update admin user", response);
// };

const updateAdminPw = async (user: AdminUser, passwordHash: string) => {
  const cmd = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      userId: user.id,
      recordId: mkAuthId(user.email),
    },
    UpdateExpression: "SET passwordHash = :passwordHash, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":passwordHash": passwordHash,
      ":updatedAt": user.updatedAt,
    },
    ReturnValues: "ALL_NEW",
  });

  const response = await client.send(cmd);
  console.log("Update admin user password", response);
};

const deleteAdminUser = async (id: string) => {
  const cmd = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: {
      ":uid": id,
    },
    ProjectionExpression: "userId, recordId",
  });

  const response = await client.send(cmd);

  console.log("Find all for user ID", response);

  if (!response.Items || response.Items.length === 0) return false;

  // TODO use a transaction here

  for (const item of response.Items) {
    const cmd = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        userId: item.userId as string,
        recordId: item.recordId as string,
      },
    });

    const response = await client.send(cmd);
    console.log("Delete admin item", response);
  }

  return true;
};

const findAdminUser = async (email: string) => {
  const cmd = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: ALL_USER_INDEX,
    KeyConditionExpression: "recordId = :recId",
    ExpressionAttributeValues: {
      ":recId": mkAuthId(email),
    },
    ProjectionExpression: "userId, recordId, userName, passwordHash, createdAt, updatedAt",
  });

  const response = await client.send(cmd);

  console.log("Find admin user", response);

  if (response.Count && response.Count > 0 && response.Items) {
    return dynamoToAdminUser(response.Items[0]);
  } else {
    return null;
  }
};

const getAdminUser = async (id: string) => {
  const cmd = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "userId = :id AND begins_with (recordId, :record)",
    ExpressionAttributeValues: {
      ":id": id,
      ":record": `${PREFIX_AUTH}${SEP}`,
    },
  });

  const response = await client.send(cmd);

  console.log("Get admin user", response);

  if (response.Count && response.Count > 0 && response.Items) {
    return dynamoToAdminUser(response.Items[0]);
  } else {
    return null;
  }
};

const listAdminUsers = async () => {
  let startKey: Record<string, any> | undefined = undefined;
  const results = [];

  do {
    const cmd: ScanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: startKey,
      FilterExpression: "begins_with (recordId, :record)",
      ExpressionAttributeValues: {
        ":record": `${PREFIX_AUTH}${SEP}`,
      },
      ProjectionExpression: "userId, recordId, userName, passwordHash, createdAt, updatedAt",
      ConsistentRead: true,
    });

    const response = await client.send(cmd);
    console.log("Scan admins", response);
    startKey = response.LastEvaluatedKey;

    if (response.Items) {
      for (const item of response.Items) {
        const record = dynamoToAdminUser(item);
        results.push(record.user);
      }
    }
  } while (startKey);

  return results;
};

export const adminUsers = {
  create: createAdminUser,
  // update: updateAdminUser,
  updatePw: updateAdminPw,
  find: findAdminUser,
  get: getAdminUser,
  list: listAdminUsers,
  delete: deleteAdminUser,
};

// ADMIN SESSIONS --------

const createAdminSession = async (user: AdminUser, token: string, expiresAt: Date) => {
  const cmd = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      userId: user.id,
      recordId: mkSessionId(token),
      expiresAt: getUnixTime(expiresAt),
    },
  });

  await client.send(cmd);
  console.log(`Created new admin session: ${user.id} -> ${user.email}`);
};

const findAdminSession = async (token: string) => {
  const cmd = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: ADMIN_SESSION_INDEX,
    KeyConditionExpression: "recordId = :recId",
    ExpressionAttributeValues: {
      ":recId": mkSessionId(token),
    },
    ProjectionExpression: "userId, recordId, expiresAt",
  });

  const response = await client.send(cmd);

  console.log("Find admin session", response);

  if (response.Count && response.Count > 0 && response.Items) {
    return {
      userId: response.Items[0].userId as string,
      sessionExpiresAt: response.Items[0].expiresAt as number,
    };
  } else {
    return { userId: null, sessionExpiresAt: null };
  }
};

const deleteAdminSession = async (userId: string, token: string) => {
  const cmd = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      userId,
      recordId: mkSessionId(token),
    },
  });

  const response = await client.send(cmd);

  console.log("Delete admin session", response);
};

export const adminSessions = {
  create: createAdminSession,
  find: findAdminSession,
  delete: deleteAdminSession,
};

// USERS & KEYS --------

const dynamoToUser = (item: Record<string, any>) => {
  const user: User = {
    id: item.userId as string,
    email: (item.recordId as string).split(SEP)[1],
    name: item.userName as string,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
  return user;
};

const dynamoToKey = (item: Record<string, any>) => {
  const key: UserApiKey = {
    id: (item.recordId as string).split(SEP)[1],
    snippet: (item.apiKey as string).substring(0, 8),
    expiresAt: formatISO(fromUnixTime(item.expiresAt as number)),
  };
  return key;
};

const createUser = async (user: User, apiKey: InternalApiKey) => {
  const cmd = new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            userId: user.id,
            recordId: mkUserId(user.email),
            userName: user.name,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            userId: user.id,
            recordId: mkUserKeyId(apiKey.id),
            apiKey: apiKey.key,
            expiresAt: apiKey.expiresAtUnix,
          },
        },
      },
    ],
    ClientRequestToken: `${user.email.substring(0, 25)}#${apiKey.key.substring(0, 8)}`,
  });

  const response = await client.send(cmd);
  console.log("Created new API user", response);
};

const findUser = async (email: string) => {
  const cmd = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: ALL_USER_INDEX,
    KeyConditionExpression: "recordId = :recId",
    ExpressionAttributeValues: {
      ":recId": mkUserId(email),
    },
    ProjectionExpression: "userId, recordId, userName, createdAt, updatedAt",
  });

  const response = await client.send(cmd);

  console.log("Find user", response);

  if (response.Count && response.Count > 0 && response.Items) {
    return dynamoToUser(response.Items[0]);
  } else {
    return null;
  }
};

const listUsers = async () => {
  let startKey: Record<string, any> | undefined = undefined;
  const users = new Map<string, User>();
  const keys = new Map<string, UserApiKey[]>();

  do {
    const cmd: ScanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: startKey,
      FilterExpression: "begins_with (recordId, :record)",
      ExpressionAttributeValues: {
        ":record": `${PREFIX_USER}`,
      },
      ProjectionExpression: "userId, recordId, userName, createdAt, updatedAt, apiKey, expiresAt",
      ConsistentRead: true,
    });

    const response = await client.send(cmd);
    console.log("Scan users", response);
    startKey = response.LastEvaluatedKey;

    if (response.Items) {
      for (const item of response.Items) {
        if ((item.recordId as string).startsWith(PREFIX_USER_KEY)) {
          // this is an API key item
          const userId = item.userId as string;
          const key = dynamoToKey(item);
          let userKeys = keys.get(userId);
          if (!userKeys) {
            userKeys = [key];
          } else {
            userKeys.push(key);
          }
          keys.set(userId, userKeys);
        } else {
          // this is an API user item
          const user = dynamoToUser(item);
          users.set(user.id, user);
        }
      }
    }
  } while (startKey);

  // construct the result
  const result: UserWithKeys[] = [];
  for (const user of users.values()) {
    let apiKeys = keys.get(user.id) || [];
    const uwk = {
      ...user,
      apiKeys,
    };
    result.push(uwk);
  }

  return result;
};

export const apiUsers = {
  list: listUsers,
  create: createUser,
  find: findUser,
};
