import {
  slackChannelIdSchema,
  slackUserIdSchema,
} from "../jsonschema/jsonschema.ts";

import { AppBlock, events } from "@slflows/sdk/v1";

import { callSlackApi } from "../slackClient.ts";

export default {
  name: "Send Ephemeral Message Blocks",
  description:
    "Sends a message with Block Kit blocks to a Slack channel that is only visible to a specific user.",
  category: "Messaging",
  inputs: {
    default: {
      name: "Send",
      description: "Trigger sending the ephemeral message.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) to send the message to.",
          type: "string",
          required: true,
        },
        userId: {
          name: "User ID",
          description:
            "ID of the user (e.g., U0123ABC) who should see the ephemeral message.",
          type: "string",
          required: true,
        },
        blocks: {
          name: "Message Blocks",
          description:
            "JSON array of Slack Block Kit blocks for the message content.",
          type: "any",
          required: true,
        },
        text: {
          name: "Fallback Text",
          description:
            "Plain text fallback for the message, used in notifications and when blocks cannot be displayed.",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, userId, blocks, text } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot send message.",
          );
        }

        // Validate blocks is an array
        if (!Array.isArray(blocks)) {
          throw new Error(
            "Blocks must be an array of Slack Block Kit objects.",
          );
        }

        const slackApiPayload: Record<string, any> = {
          channel: channelId,
          user: userId,
          blocks: blocks,
          text: text, // Fallback text
        };

        const responseData = await callSlackApi(
          "chat.postEphemeral",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          message_ts: responseData.message_ts, // Ephemeral messages use message_ts instead of ts
          channel: responseData.channel,
          user: userId,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Message Sent",
      description:
        "Emitted when the ephemeral message has been successfully sent.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          message_ts: {
            type: "string",
            description: "Timestamp of the ephemeral message that was sent.",
          },
          channel: slackChannelIdSchema,
          user: slackUserIdSchema,
        },
        required: ["message_ts", "channel", "user"],
      },
    },
  },
} satisfies AppBlock;
