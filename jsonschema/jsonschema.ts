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

export const slackBlocksSchema = {
  type: "array",
  items: {
    type: "object",
    description:
      "A Slack Block Kit layout block object. Its structure is defined by Slack. For detailed structure, refer to: https://api.slack.com/reference/block-kit/blocks",
  },
  description:
    "An array of Slack Block Kit layout blocks. Present if the message was composed using Block Kit or if Slack converted the text to a rich_text block. See Slack documentation for block structures.",
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
