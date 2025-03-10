import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { Context, SQSEvent, SQSHandler, SQSRecord } from "aws-lambda";
import { format, fromUnixTime } from "date-fns";
import {
  EmailerCommand,
  NewAdminEmailCommand,
  NewKeyEmailCommand,
  NewUserEmailCommand,
} from "./common";
import env from "./env";

const TITLE = env.devMode ? "Afterhours LLM Service [DEV]" : "Afterhours LLM Service";
const SENDER = `"${TITLE}" <no-reply@${env.domain}>`;

const client = new SESv2Client({});

export const handler: SQSHandler = async (event: SQSEvent, _context: Context) => {
  for (const msg of event.Records) {
    console.info("Got SQS emailer message", msg);
    await processMsg(msg);
  }
};

const processMsg = async (msg: SQSRecord) => {
  const ecmd = JSON.parse(msg.body) as EmailerCommand;
  try {
    switch (ecmd.type) {
      case "new-admin":
        sendNewAdminEmail(ecmd);
        break;
      case "new-user":
        sendNewUserEmail(ecmd);
        break;
      case "new-key":
        sendNewKeyEmail(ecmd);
        break;
    }
  } catch (e) {
    console.error("Send email failed", e);
    throw e;
  }
};

const sendNewAdminEmail = async (msg: NewAdminEmailCommand) => {
  const body = `Hi ${msg.name},

An admin account has been created for you at the ${TITLE}.

You can access the service at https://${env.domain}

Your initial password is: ${msg.password}

We strongly recommend changing your password once you successfully log in. Simply click on your
account badge in the bottom-left.

If you don't want an account, you can safely ignore this message.

Cheers,
~Admins
`;

  const cmd = new SendEmailCommand({
    FromEmailAddress: SENDER,
    Destination: {
      ToAddresses: ["alex@alexgladd.dev"], // TODO make this the real user email (SES production)
    },
    Content: {
      Simple: {
        Subject: {
          Data: `Welcome to the ${TITLE}!`,
        },
        Body: {
          Text: {
            Data: body,
          },
        },
      },
    },
  });

  const response = await client.send(cmd);
  console.log("Send new admin email", response);
};

const sendNewUserEmail = async (msg: NewUserEmailCommand) => {
  const body = `Hi ${msg.name},

You have been granted access to the ${TITLE} API.

You can access the API documentation at https://api.${env.domain}/docs. You'll want to check out the
endpoints for Models, Completions, and Chat.

Your initial API key is: ${msg.apiKey}

This key expires on ${format(fromUnixTime(msg.expiresAt), "PPPppp")}.

Please ensure that this API key never gets checked into any version control system. We recommend
using local environment variables instead. Please let an admin know ASAP if any API key gets exposed
or lost so that we can revoke it.

If you don't want or need access to the service, you can safely ignore this message.

Cheers,
~Admins
`;

  const cmd = new SendEmailCommand({
    FromEmailAddress: SENDER,
    Destination: {
      ToAddresses: ["alex@alexgladd.dev"], // TODO make this the real user email (SES production)
    },
    Content: {
      Simple: {
        Subject: {
          Data: `Welcome to the ${TITLE} API!`,
        },
        Body: {
          Text: {
            Data: body,
          },
        },
      },
    },
  });

  const response = await client.send(cmd);
  console.log("Send new user email", response);
};

const sendNewKeyEmail = async (msg: NewKeyEmailCommand) => {
  const body = `Hi ${msg.name},

A new API key has been created for you to access the ${TITLE} API.

Your new API key is: ${msg.apiKey}

This key expires on ${format(fromUnixTime(msg.expiresAt), "PPPppp")}.

As a reminder, you can access the API documentation at https://api.${env.domain}/docs.

Please ensure that this API key never gets checked into any version control system. We recommend
using local environment variables instead. Please let an admin know ASAP if any API key gets exposed
or lost so that we can revoke it.

If you don't want or need access to the service, you can safely ignore this message.

Cheers,
~Admins
`;

  const cmd = new SendEmailCommand({
    FromEmailAddress: SENDER,
    Destination: {
      ToAddresses: ["alex@alexgladd.dev"], // TODO make this the real user email (SES production)
    },
    Content: {
      Simple: {
        Subject: {
          Data: `New key for the ${TITLE} API!`,
        },
        Body: {
          Text: {
            Data: body,
          },
        },
      },
    },
  });

  const response = await client.send(cmd);
  console.log("Send new key email", response);
};
