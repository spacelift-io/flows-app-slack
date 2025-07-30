import {
  slackAppIdSchema,
  slackBlocksSchema,
  slackBotIdSchema,
  slackBotProfileSchema,
  slackChannelIdSchema,
  slackMessageTextSchema,
  slackMessageTimestampSchema,
  slackParentUserIdSchema,
  slackTeamIdSchema,
  slackThreadTsSchema,
  slackUserIdSchema,
} from "../jsonschema/jsonschema.ts";

import { AppBlock, events } from "@slflows/sdk/v1";

import { callSlackApi } from "../slackClient.ts";

export default {
  name: "Send Text Message",
  description:
    "Sends a simple markdown-formatted text message to a Slack channel or user. Can optionally be a thread reply.",
  category: "Messaging",
  inputs: {
    default: {
      name: "Send",
      description: "Trigger sending the message.",
      config: {
        channelId: {
          name: "Channel or User ID",
          description:
            "ID of the channel (e.g., C0123ABC), DM (D0123ABC), or user (U0123ABC) to send the message to.",
          type: "string",
          required: true,
        },
        text: {
          name: "Message Text",
          description:
            "The text of the message. Markdown is supported by default.",
          type: "string",
          required: true,
        },
        threadTs: {
          name: "Thread Timestamp",
          description:
            "If replying to a message, provide the 'ts' (timestamp) of the parent message.",
          type: "string",
          required: false,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, text, threadTs } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot send message.",
          );
        }

        const slackApiPayload: Record<string, any> = {
          channel: channelId,
          text: text,
          mrkdwn: true, // Slack processes markdown by default for chat.postMessage
        };

        if (threadTs) {
          slackApiPayload.thread_ts = threadTs;
        }

        const responseData = await callSlackApi(
          "chat.postMessage",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          ts: responseData.ts, // Timestamp of the sent message
          channel: responseData.channel, // Channel where message was sent
          message: responseData.message, // Full message object from Slack
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Message Sent",
      description: "Emitted when the message has been successfully sent.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ts: slackMessageTimestampSchema,
          channel: slackChannelIdSchema,
          message: {
            type: "object",
            description:
              "The complete message object as returned by Slack's chat.postMessage API. Contains details about the message that was posted.",
            properties: {
              type: {
                type: "string",
                enum: ["message"],
                description: "The type of the object, always 'message'.",
              },
              subtype: {
                type: "string",
                description:
                  "Optional. Indicates a subtype of message, e.g., 'bot_message'. For messages sent by this block, it's often 'bot_message'.",
              },
              ts: slackMessageTimestampSchema,
              text: slackMessageTextSchema,
              user: {
                ...slackUserIdSchema,
                description:
                  "The user ID of the sender. For messages sent by a bot token, this is the bot's user ID.",
              },
              bot_id: slackBotIdSchema,
              app_id: slackAppIdSchema,
              team: slackTeamIdSchema,
              bot_profile: slackBotProfileSchema,
              blocks: slackBlocksSchema,
              thread_ts: slackThreadTsSchema,
              parent_user_id: slackParentUserIdSchema,
            },
            // Based on typical chat.postMessage responses for new bot messages.
            required: [
              "type",
              "ts",
              "text",
              "user",
              "bot_id",
              "app_id",
              "team",
              "bot_profile",
            ],
          },
        },
        required: ["ts", "channel", "message"],
      },
    },
  },
} satisfies AppBlock;
