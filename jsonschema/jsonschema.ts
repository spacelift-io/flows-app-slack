import type { JsonSchema } from "@slflows/sdk/v1";

export const slackMessageTimestampSchema = {
  type: "string",
  description:
    "Timestamp of the message. This value is effectively the ID of the message in Slack's API and is used to reference it in other operations (e.g., updating, deleting, threading).",
};

export const slackChannelIdSchema = {
  type: "string",
  description:
    "ID of a Slack channel (e.g., C0123ABC), private group (G0123ABC), or direct message (D0123ABC).",
};

export const slackUserIdSchema = {
  type: "string",
  description: "ID of a Slack user (e.g., U0123ABC).",
};

export const slackTeamIdSchema = {
  type: "string",
  description: "ID of a Slack workspace (team) (e.g., T0123ABC).",
};

export const slackAppIdSchema = {
  type: "string",
  description: "ID of a Slack App (e.g., A0123ABC).",
};

export const slackBotIdSchema = {
  type: "string",
  description: "ID of a bot user (e.g., B0123ABC).",
};

export const slackBlockKitBlockSchema: JsonSchema = {
  oneOf: [
    {
      type: "object",
      description:
        "Section block - displays text alongside optional accessories like buttons, images, or select menus",
      properties: {
        type: { type: "string", enum: ["section"] },
        block_id: {
          type: "string",
          description: "Optional unique identifier for the block",
        },
        text: {
          type: "object",
          description: "Main text content - required unless fields is provided",
          properties: {
            type: { type: "string", enum: ["mrkdwn", "plain_text"] },
            text: { type: "string" },
            emoji: {
              type: "boolean",
              description: "Parse emojis (plain_text only)",
            },
          },
          required: ["type", "text"],
        },
        fields: {
          type: "array",
          description: "Array of text objects for multi-column layout (max 10)",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["mrkdwn", "plain_text"] },
              text: { type: "string" },
              emoji: { type: "boolean" },
            },
            required: ["type", "text"],
          },
        },
        accessory: {
          type: "object",
          description: "Interactive element (button, select, image, etc.)",
          properties: {
            type: {
              type: "string",
              enum: [
                "button",
                "static_select",
                "external_select",
                "users_select",
                "conversations_select",
                "channels_select",
                "overflow",
                "datepicker",
                "timepicker",
                "datetime_select",
                "image",
              ],
            },
          },
          required: ["type"],
        },
      },
      required: ["type"],
      additionalProperties: false,
    } as JsonSchema,
    {
      type: "object",
      description: "Divider block - creates a visual divider line",
      properties: {
        type: { type: "string", enum: ["divider"] },
        block_id: {
          type: "string",
          description: "Optional unique identifier for the block",
        },
      },
      required: ["type"],
      additionalProperties: false,
    } as JsonSchema,
    {
      type: "object",
      description: "Image block - displays an image",
      properties: {
        type: { type: "string", enum: ["image"] },
        block_id: {
          type: "string",
          description: "Optional unique identifier for the block",
        },
        image_url: {
          type: "string",
          description: "URL of the image to display",
        },
        alt_text: {
          type: "string",
          description: "Alt text for accessibility (required)",
        },
        title: {
          type: "object",
          description: "Optional title displayed below the image",
          properties: {
            type: { type: "string", enum: ["plain_text"] },
            text: { type: "string" },
            emoji: { type: "boolean" },
          },
          required: ["type", "text"],
        },
      },
      required: ["type", "image_url", "alt_text"],
      additionalProperties: false,
    } as JsonSchema,
    {
      type: "object",
      description:
        "Actions block - container for interactive elements like buttons and select menus",
      properties: {
        type: { type: "string", enum: ["actions"] },
        block_id: {
          type: "string",
          description: "Optional unique identifier for the block",
        },
        elements: {
          type: "array",
          description: "Interactive elements (max 25)",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "button",
                  "static_select",
                  "external_select",
                  "users_select",
                  "conversations_select",
                  "channels_select",
                  "overflow",
                  "datepicker",
                  "timepicker",
                  "datetime_select",
                ],
              },
            },
            required: ["type"],
          },
        },
      },
      required: ["type", "elements"],
      additionalProperties: false,
    } as JsonSchema,
    {
      type: "object",
      description:
        "Context block - displays contextual info with small text and images",
      properties: {
        type: { type: "string", enum: ["context"] },
        block_id: {
          type: "string",
          description: "Optional unique identifier for the block",
        },
        elements: {
          type: "array",
          description: "Mix of text and image elements (max 10)",
          items: {
            oneOf: [
              {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["mrkdwn", "plain_text"] },
                  text: { type: "string" },
                  emoji: { type: "boolean" },
                },
                required: ["type", "text"],
              },
              {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["image"] },
                  image_url: { type: "string" },
                  alt_text: { type: "string" },
                },
                required: ["type", "image_url", "alt_text"],
              },
            ],
          },
        },
      },
      required: ["type", "elements"],
      additionalProperties: false,
    } as JsonSchema,
    {
      type: "object",
      description: "Header block - displays large header text",
      properties: {
        type: { type: "string", enum: ["header"] },
        block_id: {
          type: "string",
          description: "Optional unique identifier for the block",
        },
        text: {
          type: "object",
          description: "Header text (plain text only)",
          properties: {
            type: { type: "string", enum: ["plain_text"] },
            text: { type: "string" },
            emoji: { type: "boolean" },
          },
          required: ["type", "text"],
        },
      },
      required: ["type", "text"],
      additionalProperties: false,
    } as JsonSchema,
    {
      type: "object",
      description: "Input block - collects user input in modals and forms",
      properties: {
        type: { type: "string", enum: ["input"] },
        block_id: {
          type: "string",
          description: "Optional unique identifier for the block",
        },
        label: {
          type: "object",
          description: "Label for the input element",
          properties: {
            type: { type: "string", enum: ["plain_text"] },
            text: { type: "string" },
            emoji: { type: "boolean" },
          },
          required: ["type", "text"],
        },
        element: {
          type: "object",
          description: "The input element",
          properties: {
            type: {
              type: "string",
              enum: [
                "plain_text_input",
                "email_text_input",
                "url_text_input",
                "number_input",
                "static_select",
                "multi_static_select",
                "external_select",
                "multi_external_select",
                "users_select",
                "multi_users_select",
                "conversations_select",
                "multi_conversations_select",
                "channels_select",
                "multi_channels_select",
                "datepicker",
                "timepicker",
                "datetime_select",
                "checkboxes",
                "radio_buttons",
              ],
            },
          },
          required: ["type"],
        },
        hint: {
          type: "object",
          description: "Optional hint text",
          properties: {
            type: { type: "string", enum: ["plain_text"] },
            text: { type: "string" },
            emoji: { type: "boolean" },
          },
          required: ["type", "text"],
        },
        optional: {
          type: "boolean",
          description: "Whether input is optional (default false)",
        },
        dispatch_action: {
          type: "boolean",
          description: "Whether to dispatch actions on character entry",
        },
      },
      required: ["type", "label", "element"],
      additionalProperties: false,
    } as JsonSchema,
  ],
};

export const slackBlocksSchema: JsonSchema = {
  type: "array",
  items: slackBlockKitBlockSchema,
  description:
    "An array of Slack Block Kit layout blocks. Present if the message was composed using Block Kit or if Slack converted the text to a rich_text block. See Slack documentation for block structures: https://api.slack.com/reference/block-kit/blocks",
};

export const slackThreadTsSchema = {
  type: "string",
  description:
    "Optional. The timestamp of the parent message, if this message is part of a thread. If this message starts a new thread by replying to an existing message, this field will be present. If it's a brand new message not in a thread, this field is usually absent unless it becomes the parent of a new thread, in which case `thread_ts` would equal `ts`.",
};

export const slackParentUserIdSchema = {
  type: "string",
  description:
    "Optional. The user ID of the author of the parent message, if this message is a reply in a thread.",
};

export const slackMessageTextSchema = {
  type: "string",
  description:
    "The textual content of the message. Markdown is supported by default in many contexts.",
};

export const slackEventTsSchema = {
  type: "string",
  description:
    "The timestamp of when an event was dispatched by Slack. It's often very close to the message's own 'ts'.",
};

export const slackClientMsgIdSchema = {
  type: "string",
  description:
    "A unique identifier for a message, sent by the client. Typically present for user-posted messages.",
};

export const slackChannelTypeSchema = {
  type: "string",
  description:
    "Indicates the type of channel: 'channel' (public), 'group' (private), 'im' (direct message), 'mpim' (multi-person direct message).",
};

export const slackBotProfileIconsSchema = {
  type: "object",
  description: "URLs for the bot's avatar images.",
  properties: {
    image_36: { type: "string", description: "URL for 36x36px icon." },
    image_48: { type: "string", description: "URL for 48x48px icon." },
    image_72: { type: "string", description: "URL for 72x72px icon." },
  },
  required: ["image_36", "image_48", "image_72"],
};

export const slackBotProfileSchema = {
  type: "object",
  description: "Profile information for the bot user that posted the message.",
  properties: {
    id: {
      ...slackBotIdSchema,
      description: "Bot ID (same as the outer bot_id if present).",
    },
    deleted: {
      type: "boolean",
      description: "Indicates if the bot user is deleted.",
    },
    name: { type: "string", description: "Display name of the bot." },
    updated: {
      type: "number",
      description: "Timestamp (Unix epoch) of the last profile update.",
    },
    app_id: {
      ...slackAppIdSchema,
      description:
        "The App ID associated with this bot (same as the outer app_id if present).",
    },
    icons: slackBotProfileIconsSchema,
    team_id: {
      ...slackTeamIdSchema,
      description:
        "The Team ID (workspace ID) this bot belongs to (same as the outer team if present).",
    },
  },
  required: ["id", "deleted", "name", "updated", "app_id", "icons", "team_id"],
};
