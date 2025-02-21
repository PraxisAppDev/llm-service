import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { getUnixTime } from "date-fns";
import { Resource } from "sst";
import { AdminUser } from "./schemas";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME: string = Resource["llm-db"].name;
const ADMIN_AUTH_INDEX: string = "AdminAuthIdx";
const ADMIN_SESSION_INDEX: string = "AdminSessionIdx";

const SEP = "#";
const PREFIX_AUTH = "Auth";
const PREFIX_SESSION = "Session";

const mkAuthId = (email: string) => `${PREFIX_AUTH}${SEP}${email}`;
const mkSessionId = (token: string) => `${PREFIX_SESSION}${SEP}${token}`;

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
  console.info(`Created new admin user: ${user.id} -> ${user.email}`);
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
//   console.info("Update admin user", response);
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
  console.info("Update admin user password", response);
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

  console.info("Find all for user ID", response);

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
    console.info("Delete admin item", response);
  }

  return true;
};

const findAdminUser = async (email: string) => {
  const cmd = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: ADMIN_AUTH_INDEX,
    KeyConditionExpression: "recordId = :recId",
    ExpressionAttributeValues: {
      ":recId": mkAuthId(email),
    },
    ProjectionExpression: "userId, recordId, userName, passwordHash, createdAt, updatedAt",
  });

  const response = await client.send(cmd);

  console.info("Find admin user", response);

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

  console.info("Get admin user", response);

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
    console.info("Scan admins", response);
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
  console.info(`Created new admin session: ${user.id} -> ${user.email}`);
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

  console.info("Find admin session", response);

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
