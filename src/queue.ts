import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Resource } from "sst";
import { EmailerCommand } from "./common";

const client = new SQSClient({});

export const sendEmailerMessage = async (msg: EmailerCommand, ddId?: string) => {
  const cmd = new SendMessageCommand({
    QueueUrl: Resource.Emailer.url,
    MessageGroupId: msg.type,
    MessageDeduplicationId: ddId,
    MessageBody: JSON.stringify(msg),
  });

  const response = await client.send(cmd);
  console.log("Queue emailer message", response);
};
