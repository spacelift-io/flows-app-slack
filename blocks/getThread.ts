import { AppBlock, events } from "@slflows/sdk/v1";
import { callSlackApi } from "../slackClient.ts";
import {
  slackChannelIdSchema,
  slackMessageTimestampSchema,
} from "../jsonschema/jsonschema.ts";

export const getThread: AppBlock = {
  name: "Get Thread",
  description:
    "Retrieves an entire Slack thread as a single object given a message timestamp.",
  category: "Messaging",

  inputs: {
    default: {
      name: "Get",
      description:
        "Retrieve the entire thread for the given message timestamp.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel where the thread exists (e.g., C0123ABC).",
          type: "string",
          required: true,
        },
        threadTs: {
          name: "Thread Timestamp",
          description:
            "The timestamp of any message in the thread. Can be the parent message or any reply.",
          type: "string",
          required: true,
        },
        limit: {
          name: "Limit",
          description:
            "Maximum number of messages to retrieve from the thread. Defaults to 1000.",
          type: "number",
          default: 1000,
          required: false,
        },
        oldest: {
          name: "Oldest",
          description:
            "Only messages after this Unix timestamp will be included in results.",
          type: "string",
          required: false,
        },
        latest: {
          name: "Latest",
          description:
            "Only messages before this Unix timestamp will be included in results.",
          type: "string",
          required: false,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, threadTs, limit, oldest, latest } =
          input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot retrieve thread.",
          );
        }

        const slackApiPayload: Record<string, any> = {
          channel: channelId,
          ts: threadTs,
        };

        // Only add limit if it's a valid number
        const finalLimit = limit || 1000;
        if (
          typeof finalLimit === "number" &&
          finalLimit > 0 &&
          finalLimit <= 1000
        ) {
          slackApiPayload.limit = finalLimit;
        } else {
          slackApiPayload.limit = 1000; // Default to max allowed
        }

        if (oldest && typeof oldest === "string" && oldest.trim() !== "") {
          slackApiPayload.oldest = oldest;
        }

        if (latest && typeof latest === "string" && latest.trim() !== "") {
          slackApiPayload.latest = latest;
        }

        const responseData = await callSlackApi(
          "conversations.replies",
          slackApiPayload,
          slackBotToken,
          "form",
        );

        const thread = {
          channel: channelId,
          thread_ts: threadTs,
          messages: responseData.messages || [],
          has_more: responseData.has_more || false,
          response_metadata: responseData.response_metadata || {},
        };

        await events.emit(thread);
      },
    },
  },

  outputs: {
    default: {
      name: "Thread Retrieved",
      description: "Emitted when the thread has been successfully retrieved.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
          thread_ts: slackMessageTimestampSchema,
          messages: {
            type: "array",
            description:
              "Array of all messages in the thread, including the parent message.",
            items: {
              type: "object",
              description: "A Slack message object.",
              properties: {
                type: {
                  type: "string",
                  description: "The type of the message.",
                },
                subtype: {
                  type: "string",
                  description: "Optional subtype of the message.",
                },
                ts: slackMessageTimestampSchema,
                text: {
                  type: "string",
                  description: "The text content of the message.",
                },
                user: {
                  type: "string",
                  description: "The user ID of the message sender.",
                },
                thread_ts: slackMessageTimestampSchema,
                parent_user_id: {
                  type: "string",
                  description:
                    "The user ID of the parent message author (for replies).",
                },
                reply_count: {
                  type: "number",
                  description:
                    "Number of replies to this message (for parent messages).",
                },
                reply_users_count: {
                  type: "number",
                  description:
                    "Number of unique users who replied (for parent messages).",
                },
                latest_reply: slackMessageTimestampSchema,
                blocks: {
                  type: "array",
                  description: "Optional Block Kit blocks for rich formatting.",
                },
                bot_id: {
                  type: "string",
                  description: "Bot ID if the message was sent by a bot.",
                },
                app_id: {
                  type: "string",
                  description: "App ID if the message was sent by an app.",
                },
                reactions: {
                  type: "array",
                  description: "Array of reactions on this message.",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "The emoji name (without colons).",
                      },
                      users: {
                        type: "array",
                        items: { type: "string" },
                        description:
                          "Array of user IDs who reacted with this emoji.",
                      },
                      count: {
                        type: "number",
                        description:
                          "Number of users who reacted with this emoji.",
                      },
                    },
                  },
                },
              },
              required: ["type", "ts", "text", "user"],
            },
          },
          has_more: {
            type: "boolean",
            description:
              "Whether there are more messages in the thread than were returned.",
          },
          response_metadata: {
            type: "object",
            description: "Pagination metadata from Slack API.",
            properties: {
              next_cursor: {
                type: "string",
                description: "Cursor for pagination if more results exist.",
              },
            },
          },
        },
        required: ["channel", "thread_ts", "messages", "has_more"],
      },
    },
  },
};
