import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { UTCDate } from "@date-fns/utc";
import { hash } from "@node-rs/argon2";
import { createId } from "@paralleldrive/cuid2";
import { formatISO } from "date-fns";
import fs from "node:fs";
import path from "node:path";

const SCRIPT_DIR = import.meta.dirname;
const BASE_DIR = path.resolve(SCRIPT_DIR, "..");
const SCRIPT_PATH = import.meta.url;
const SCRIPT_NAME = path.basename(SCRIPT_PATH);
const SST_OUTPUTS_FILE = path.resolve(BASE_DIR, ".sst", "outputs.json");

const argonOpts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

function printUsage(exitCode = 0) {
  console.info(`Usage: ${SCRIPT_NAME} NAME EMAIL PASSWORD
    NAME     - The admin's name (enclose in quotes)
    EMAIL    - The admin's email address (enclose in quotes)
    PASSWORD - The admin's password (enclose in quotes)\n`);

  process.exit(exitCode);
}

console.info("[*] Starting seed-admin");

if (process.argv.length < 5) {
  console.error("[-] You must provide arguments for name, email, and password\n");
  printUsage(1);
}

const adminId = createId();
const adminName = process.argv[2].trim();
const adminEmail = process.argv[3].trim();
const adminPassword = process.argv[4];
const pwh = await hash(adminPassword, argonOpts);
const now = formatISO(new UTCDate());

let sst;
try {
  console.info("[*] Reading and parsing SST outputs file...");
  const data = fs.readFileSync(SST_OUTPUTS_FILE, "utf-8");
  sst = JSON.parse(data);

  if (!sst.table) {
    console.error("[-] SST table name is not defined in outputs!");
    process.exit(1);
  }

  console.info(`[+] Got table name: ${sst.table}`);
} catch (e) {
  console.error(`[-] Failed to read SST outputs file ${SST_OUTPUTS_FILE}`, e);
  process.exit(1);
}

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: "us-east-1",
  })
);

const findCmd = new QueryCommand({
  TableName: sst.table,
  IndexName: "AllUserIdx",
  KeyConditionExpression: "recordId = :recId",
  ExpressionAttributeValues: {
    ":recId": `AuthUser#${adminEmail}`,
  },
  ProjectionExpression: "userId, recordId",
});

try {
  console.info("[*] Checking if admin already exists...");
  const r = await client.send(findCmd);

  if (r.Count && r.Count > 0) {
    console.info(`[+] Admin ${adminEmail} alredy exists -> ${r.Items[0].userId}`);
    process.exit(0);
  } else {
    console.info("[+] Admin does not exist");
  }
} catch (e) {
  console.error("[-] Failed to check for admin user", e);
  process.exit(1);
}

const createCmd = new PutCommand({
  TableName: sst.table,
  Item: {
    userId: adminId,
    recordId: `AuthUser#${adminEmail}`,
    userName: adminName,
    passwordHash: pwh,
    createdAt: now,
    updatedAt: now,
  },
});

try {
  console.info("[*] Sending admin creation request...");
  await client.send(createCmd);
  console.info(`[+] Created admin user: ${adminEmail} -> ${adminId}`);
} catch (e) {
  console.error("[-] Failed to create admin user", e);
  process.exit(1);
}

console.info("[*] Done");
