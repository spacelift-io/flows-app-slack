import {
  slackChannelIdSchema,
  slackMessageTimestampSchema,
} from "../jsonschema/jsonschema.ts";

import { AppBlock, events } from "@slflows/sdk/v1";

import { callSlackApi } from "../slackClient.ts";

export const getReactions: AppBlock = {
  name: "Get Reactions",
  description: "Gets all reactions for a specific message in a Slack channel.",
  category: "Reactions",
  inputs: {
    default: {
      name: "Get",
      description: "Trigger getting reactions for the specified message.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) containing the message.",
          type: "string",
          required: true,
        },
        ts: {
          name: "Message Timestamp",
          description:
            "The timestamp (ts) of the message to get reactions for.",
          type: "string",
          required: true,
        },
        full: {
          name: "Full Details",
          description:
            "If true, returns full reaction details including user lists. If false, returns only reaction counts.",
          type: "boolean",
          required: false,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, ts, full } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot get reactions.",
          );
        }

        // reactions.get requires application/x-www-form-urlencoded
        const params = new URLSearchParams({
          channel: channelId,
          timestamp: ts,
        });

        if (full !== undefined) {
          params.append("full", full.toString());
        }

        const response = await fetch(`https://slack.com/api/reactions.get`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${slackBotToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        const responseData = await response.json();
        if (!responseData.ok) {
          throw new Error(
            `Slack API error (reactions.get): ${responseData.error || "Unknown error"}`,
          );
        }

        await events.emit({
          channel: responseData.channel,
          message: responseData.message,
          type: responseData.type,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Reactions Retrieved",
      description: "Emitted when reactions have been successfully retrieved.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
          message: {
            type: "object",
            description: "The message object with its reactions.",
            properties: {
              ts: slackMessageTimestampSchema,
              reactions: {
                type: "array",
                description: "Array of reaction objects on this message.",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "The emoji name (without colons).",
                    },
                    count: {
                      type: "number",
                      description:
                        "Number of users who reacted with this emoji.",
                    },
                    users: {
                      type: "array",
                      description:
                        "Array of user IDs who reacted (if full=true).",
                      items: {
                        type: "string",
                      },
                    },
                  },
                  required: ["name", "count"],
                },
              },
            },
            required: ["ts"],
          },
          type: {
            type: "string",
            description: "Type of the item (typically 'message').",
          },
        },
        required: ["channel", "message", "type"],
      },
    },
  },
};

export const addReaction: AppBlock = {
  name: "Add Reaction",
  description:
    "Adds a reaction (emoji) to a specific message in a Slack channel.",
  category: "Reactions",
  inputs: {
    default: {
      name: "Add",
      description: "Trigger adding a reaction to the specified message.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) containing the message.",
          type: "string",
          required: true,
        },
        ts: {
          name: "Message Timestamp",
          description:
            "The timestamp (ts) of the message to add a reaction to.",
          type: "string",
          required: true,
        },
        name: {
          name: "Reaction Name",
          description:
            "The emoji name to add as a reaction (without colons, e.g., 'thumbsup', 'heart').",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, ts, name } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot add reaction.",
          );
        }

        const slackApiPayload = {
          channel: channelId,
          timestamp: ts,
          name: name,
        };

        await callSlackApi("reactions.add", slackApiPayload, slackBotToken);

        await events.emit({
          channel: channelId,
          ts: ts,
          reaction: name,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Reaction Added",
      description: "Emitted when the reaction has been successfully added.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
          ts: slackMessageTimestampSchema,
          reaction: {
            type: "string",
            description: "The emoji name that was added as a reaction.",
          },
        },
        required: ["channel", "ts", "reaction", "ok"],
      },
    },
  },
};

export const removeReaction: AppBlock = {
  name: "Remove Reaction",
  description:
    "Removes a reaction (emoji) from a specific message in a Slack channel.",
  category: "Reactions",
  inputs: {
    default: {
      name: "Remove",
      description: "Trigger removing a reaction from the specified message.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) containing the message.",
          type: "string",
          required: true,
        },
        ts: {
          name: "Message Timestamp",
          description:
            "The timestamp (ts) of the message to remove a reaction from.",
          type: "string",
          required: true,
        },
        name: {
          name: "Reaction Name",
          description:
            "The emoji name to remove as a reaction (without colons, e.g., 'thumbsup', 'heart').",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, ts, name } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot remove reaction.",
          );
        }

        const slackApiPayload = {
          channel: channelId,
          timestamp: ts,
          name: name,
        };

        await callSlackApi("reactions.remove", slackApiPayload, slackBotToken);

        await events.emit({
          channel: channelId,
          ts: ts,
          reaction: name,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Reaction Removed",
      description: "Emitted when the reaction has been successfully removed.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
          ts: slackMessageTimestampSchema,
          reaction: {
            type: "string",
            description: "The emoji name that was removed as a reaction.",
          },
        },
        required: ["channel", "ts", "reaction"],
      },
    },
  },
};
