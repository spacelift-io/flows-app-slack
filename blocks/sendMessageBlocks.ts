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
  name: "Send Message Blocks",
  description:
    "Sends a message to a Slack channel or user with a JSON list of Block Kit blocks. Can optionally be a thread reply.",
  category: "Messaging",
  inputs: {
    default: {
      name: "Send",
      description: "Trigger sending the message with blocks.",
      config: {
        channelId: {
          name: "Channel or User ID",
          description:
            "ID of the channel (e.g., C0123ABC), DM (D0123ABC), or user (U0123ABC) to send the message to.",
          type: "string",
          required: true,
        },
        blocks: {
          name: "Message Blocks",
          description:
            "The Slack Block Kit blocks to include in the message, as a JSON array.",
          type: {
            type: "array",
            items: {
              type: "object",
              description: "A Slack Block Kit block object.",
            },
          },
          required: true,
        },
        text: {
          name: "Fallback Text",
          description:
            "Fallback text to display in notifications and for accessibility. Should summarize the content of your blocks.",
          type: "string",
          required: false,
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
        const { channelId, blocks, text, threadTs } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot send message.",
          );
        }

        const slackApiPayload: Record<string, any> = {
          channel: channelId,
          blocks: blocks,
        };

        // Include optional text fallback if provided
        if (text) {
          slackApiPayload.text = text;
        } else {
          // Slack requires text field if blocks might not render in some clients
          slackApiPayload.text = "Message with blocks";
        }

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
      description:
        "Emitted when the message with blocks has been successfully sent.",
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
            required: [
              "type",
              "ts",
              "text",
              "user",
              "bot_id",
              "app_id",
              "team",
              "bot_profile",
              "blocks",
            ],
          },
        },
        required: ["ts", "channel", "message"],
      },
    },
  },
} satisfies AppBlock;
