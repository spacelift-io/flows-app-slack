import {
  slackBlocksSchema,
  slackChannelIdSchema,
  slackMessageTimestampSchema,
} from "../jsonschema/jsonschema.ts";

import { AppBlock, events } from "@slflows/sdk/v1";

import { callSlackApi } from "../slackClient.ts";

export default {
  name: "Update Message Blocks",
  description: "Updates an existing Slack message with new Block Kit blocks.",
  category: "Messaging",
  inputs: {
    default: {
      name: "Update",
      description: "Trigger updating the message with new blocks.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) containing the message to update.",
          type: "string",
          required: true,
        },
        ts: {
          name: "Message Timestamp",
          description: "Timestamp (ts) of the message to update.",
          type: "string",
          required: true,
        },
        blocks: {
          name: "New Message Blocks",
          description:
            "The new Slack Block Kit blocks to replace the message content, as a JSON array.",
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
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, ts, blocks, text } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot update message.",
          );
        }

        const slackApiPayload: Record<string, any> = {
          channel: channelId,
          ts: ts,
          blocks: blocks,
        };

        // Include optional text fallback if provided
        if (text) {
          slackApiPayload.text = text;
        } else {
          // Slack requires text field if blocks might not render in some clients
          slackApiPayload.text = "Message with blocks";
        }

        const responseData = await callSlackApi(
          "chat.update",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          ts: responseData.ts,
          channel: responseData.channel,
          text: responseData.text,
          blocks: responseData.blocks,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Message Updated",
      description: "Emitted when the message has been successfully updated.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ts: slackMessageTimestampSchema,
          channel: slackChannelIdSchema,
          text: {
            type: "string",
            description: "The text content of the updated message.",
          },
          blocks: slackBlocksSchema,
        },
        required: ["ts", "channel"],
      },
    },
  },
} satisfies AppBlock;
