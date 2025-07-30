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

import { AppBlock, events, kv } from "@slflows/sdk/v1";

import { callSlackApi } from "../slackClient.ts";

export default {
  name: "Send Message With Interactions",
  description:
    "Sends a message with Block Kit blocks to a Slack channel and listens for user interactions (button clicks, menu selections, etc.). Has two outputs: one when the message is sent, and one for each interaction.",
  category: "Messaging",
  inputs: {
    default: {
      name: "Send",
      description: "Trigger sending the interactive message.",
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
            "The Slack Block Kit blocks to include in the message, as a JSON array. May contain interactive elements like buttons, select menus, etc.",
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
          slackApiPayload.text = "Interactive message";
        }

        if (threadTs) {
          slackApiPayload.thread_ts = threadTs;
        }

        const responseData = await callSlackApi(
          "chat.postMessage",
          slackApiPayload,
          slackBotToken,
        );

        // Store interaction metadata for this message
        const messageTs = responseData.ts;
        await kv.app.set({
          key: `interaction:${messageTs}`,
          value: {
            blockId: input.block.id,
            originalEventId: input.event.id,
          },
        });

        await events.emit(
          {
            ts: responseData.ts,
            channel: responseData.channel,
            message: responseData.message,
          },
          { outputKey: "sent" },
        );
      },
    },
  },
  async onInternalMessage(input) {
    // Handle interaction callbacks routed from the app's HTTP handler
    const messageBody = input.message.body;

    if (messageBody.type === "slack_interaction") {
      const { payload, originalEventId } = messageBody;

      await events.emit(
        {
          type: payload.type,
          user: {
            id: payload.user.id,
            username: payload.user.username,
            name: payload.user.name,
            team_id: payload.user.team_id,
          },
          container: payload.container,
          trigger_id: payload.trigger_id,
          team: payload.team,
          enterprise: payload.enterprise,
          is_enterprise_install: payload.is_enterprise_install,
          channel: payload.channel,
          message: payload.message,
          actions: payload.actions,
          response_url: payload.response_url,
          view: payload.view,
          api_app_id: payload.api_app_id,
          token: payload.token,
        },
        {
          outputKey: "interaction",
          parentEventId: originalEventId,
        },
      );
    }
  },
  outputs: {
    sent: {
      name: "Message Sent",
      description:
        "Emitted when the interactive message has been successfully sent.",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ts: slackMessageTimestampSchema,
          channel: slackChannelIdSchema,
          message: {
            type: "object",
            description:
              "The complete message object as returned by Slack's chat.postMessage API.",
            properties: {
              type: {
                type: "string",
                enum: ["message"],
                description: "The type of the object, always 'message'.",
              },
              subtype: {
                type: "string",
                description:
                  "Optional. Indicates a subtype of message, e.g., 'bot_message'.",
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
    interaction: {
      name: "Interaction Received",
      description:
        "Emitted when a user interacts with the message (clicks button, selects from menu, etc.).",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        description:
          "Slack interaction payload containing details about the user action.",
        properties: {
          type: {
            type: "string",
            description:
              "The type of interaction (e.g., 'block_actions', 'interactive_message', 'view_submission').",
          },
          user: {
            type: "object",
            description:
              "Information about the user who performed the interaction.",
            properties: {
              id: slackUserIdSchema,
              username: { type: "string", description: "The user's username." },
              name: { type: "string", description: "The user's display name." },
              team_id: slackTeamIdSchema,
            },
            required: ["id", "username", "name", "team_id"],
          },
          container: {
            type: "object",
            description: "Information about the message container.",
            properties: {
              type: {
                type: "string",
                description: "Container type (usually 'message').",
              },
              message_ts: slackMessageTimestampSchema,
            },
            required: ["type", "message_ts"],
          },
          trigger_id: {
            type: "string",
            description:
              "A temporary token to open modals or other interactive elements.",
          },
          team: {
            type: "object",
            description: "Information about the workspace.",
            properties: {
              id: slackTeamIdSchema,
              domain: { type: "string", description: "Workspace domain." },
            },
            required: ["id", "domain"],
          },
          channel: {
            type: "object",
            description:
              "Information about the channel where the interaction occurred.",
            properties: {
              id: slackChannelIdSchema,
              name: { type: "string", description: "Channel name." },
            },
            required: ["id", "name"],
          },
          message: {
            type: "object",
            description: "The message that contains the interactive element.",
          },
          actions: {
            type: "array",
            description: "Array of actions that were triggered.",
            items: {
              type: "object",
              description:
                "Details about the specific action (button click, menu selection, etc.).",
              properties: {
                action_id: {
                  type: "string",
                  description:
                    "The action_id of the element that was triggered.",
                },
                block_id: {
                  type: "string",
                  description:
                    "The block_id of the block containing the triggered element.",
                },
                type: {
                  type: "string",
                  description:
                    "The type of action (e.g., 'button', 'static_select', 'users_select', 'conversations_select', 'channels_select', 'external_select', 'overflow', 'datepicker', 'timepicker', 'radio_buttons', 'checkboxes').",
                },
                action_ts: {
                  type: "string",
                  description: "Timestamp when the action occurred.",
                },
                text: {
                  type: "object",
                  description: "Text object for elements like buttons.",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["plain_text", "mrkdwn"],
                    },
                    text: {
                      type: "string",
                    },
                    emoji: {
                      type: "boolean",
                    },
                  },
                },
                value: {
                  type: "string",
                  description:
                    "The value of the action (for buttons and overflow menus).",
                },
                selected_option: {
                  type: "object",
                  description: "The selected option (for single select menus).",
                  properties: {
                    text: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        text: { type: "string" },
                      },
                    },
                    value: { type: "string" },
                  },
                },
                selected_options: {
                  type: "array",
                  description: "The selected options (for multi-select menus).",
                  items: {
                    type: "object",
                    properties: {
                      text: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          text: { type: "string" },
                        },
                      },
                      value: { type: "string" },
                    },
                  },
                },
                selected_date: {
                  type: "string",
                  description:
                    "The selected date (for datepicker, format: YYYY-MM-DD).",
                },
                selected_time: {
                  type: "string",
                  description:
                    "The selected time (for timepicker, format: HH:MM).",
                },
                selected_user: {
                  type: "string",
                  description: "The selected user ID (for users_select).",
                },
                selected_users: {
                  type: "array",
                  description:
                    "The selected user IDs (for multi_users_select).",
                  items: { type: "string" },
                },
                selected_channel: {
                  type: "string",
                  description: "The selected channel ID (for channels_select).",
                },
                selected_channels: {
                  type: "array",
                  description:
                    "The selected channel IDs (for multi_channels_select).",
                  items: { type: "string" },
                },
                selected_conversation: {
                  type: "string",
                  description:
                    "The selected conversation ID (for conversations_select).",
                },
                selected_conversations: {
                  type: "array",
                  description:
                    "The selected conversation IDs (for multi_conversations_select).",
                  items: { type: "string" },
                },
              },
              required: ["action_id", "block_id", "type", "action_ts"],
            },
          },
          response_url: {
            type: "string",
            description: "URL that can be used to respond to the interaction.",
          },
        },
        required: ["type", "user", "trigger_id", "team", "channel"],
      },
    },
  },
} satisfies AppBlock;
