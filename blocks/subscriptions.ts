import { AppBlock, blocks, events, messaging } from "@slflows/sdk/v1"; // TODO: Move the http subscription event handler here.

import {
  slackAppIdSchema,
  slackBlocksSchema,
  slackBotIdSchema,
  slackChannelIdSchema,
  slackChannelTypeSchema,
  slackClientMsgIdSchema,
  slackEventTsSchema,
  slackMessageTextSchema,
  slackMessageTimestampSchema,
  slackParentUserIdSchema,
  slackTeamIdSchema,
  slackThreadTsSchema,
  slackUserIdSchema,
} from "../jsonschema/jsonschema.ts";

export const handleEventSubscriptions = async (event: any) => {
  if (event.type === "app_mention") {
    const mentionSubscriptionBlocks = await blocks.list({
      typeIds: ["appMentionSubscription", "conversation"],
    });

    // Filter blocks by their configured channel (if present)
    const relevantBlocks = mentionSubscriptionBlocks.blocks.filter((block) => {
      const configuredChannelId = block.config.channelId;
      return !configuredChannelId || configuredChannelId === event.channel;
    });

    if (relevantBlocks.length > 0) {
      console.log(
        `Routing app_mention to ${relevantBlocks.length} subscription block(s).`,
      );
      await messaging.sendToBlocks({
        blockIds: relevantBlocks.map((b) => b.id),
        body: event, // Send the full Slack event object
      });
    } else {
      console.log(
        "No relevant appMentionSubscription blocks found for app_mention event.",
      );
    }
  } else if (
    event.type === "reaction_added" ||
    event.type === "reaction_removed"
  ) {
    const reactionSubscriptionBlocks = await blocks.list({
      typeIds: ["reactionsSubscription"],
    });
    if (reactionSubscriptionBlocks.blocks.length > 0) {
      console.log(
        `Routing ${event.type} to ${reactionSubscriptionBlocks.blocks.length} subscription block(s).`,
      );
      await messaging.sendToBlocks({
        blockIds: reactionSubscriptionBlocks.blocks.map((b) => b.id),
        body: event, // Send the full Slack event object
      });
    } else {
      console.log(
        `No reactionsSubscription blocks found for ${event.type} event.`,
      );
    }
  } else if (event.type === "message") {
    const messageSubscriptionBlocks = await blocks.list({
      typeIds: ["messagesSubscription", "conversation", "botThread"],
    });

    // Filter blocks by their configured channel (if present)
    const relevantBlocks = messageSubscriptionBlocks.blocks.filter((block) => {
      const configuredChannelId = block.config.channelId;
      return !configuredChannelId || configuredChannelId === event.channel;
    });

    if (relevantBlocks.length > 0) {
      await messaging.sendToBlocks({
        blockIds: relevantBlocks.map((b) => b.id),
        body: event, // Send the full Slack event object
      });
    } else {
      console.log(
        "No relevant messagesSubscription blocks found for message event.",
      );
    }
  }
};

export const appMentionSubscription: AppBlock = {
  name: "App Mention Subscription",
  description:
    "Subscribes to @mentions of this Slack app in any channel it's a member of.",
  category: "Messaging",
  config: {
    channelId: {
      name: "Channel ID (Optional)",
      description:
        "If specified, only app mentions from this channel will be received. Leave empty to receive mentions from all channels the app has access to.",
      type: "string",
      required: false,
    },
  },
  async onInternalMessage({ block, message }) {
    // EntityOnInternalMessageInput
    // The body of the message is the Slack event payload, routed by the app's main HTTP handler.
    const slackEvent = message.body;
    // It's good practice to ensure the event is indeed what we expect, though routing should handle this.
    if (slackEvent && slackEvent.type === "app_mention") {
      // Check if we should filter by channel
      const configuredChannelId = block.config.channelId;
      if (configuredChannelId && slackEvent.channel !== configuredChannelId) {
        console.error(
          "App mention unexpectedly received from a different channel: ",
          slackEvent.channel,
        );
        return;
      }

      await events.emit(slackEvent);
    } else {
      console.warn(
        "appMentionSubscription received unexpected internal message:",
        slackEvent,
      );
    }
  },
  outputs: {
    default: {
      name: "On App Mention",
      description:
        "Emitted when the app is mentioned. Contains the Slack app_mention event payload.",
      type: {
        type: "object",
        description:
          "Payload of a Slack 'app_mention' event. See https://api.slack.com/events/app_mention for more details.",
        properties: {
          type: {
            type: "string",
            enum: ["app_mention"],
            description:
              "The specific type of event. For this block, it will always be 'app_mention'.",
          },
          user: slackUserIdSchema,
          text: slackMessageTextSchema,
          ts: slackMessageTimestampSchema,
          channel: slackChannelIdSchema,
          event_ts: slackEventTsSchema,
          team: slackTeamIdSchema,
          client_msg_id: {
            ...slackClientMsgIdSchema,
            description:
              "A unique identifier for the message, sent by the client. Only present for user-posted messages that trigger the mention.",
          },
          blocks: slackBlocksSchema,
          channel_type: slackChannelTypeSchema,
          bot_id: {
            ...slackBotIdSchema,
            description:
              "Optional. The bot ID, if the message that caused the mention was posted by a bot user. Not typically present for app_mention events triggered by human users mentioning the app.",
          },
          app_id: {
            ...slackAppIdSchema,
            description:
              "The ID of the application that is being mentioned (i.e., this app).",
          },
          thread_ts: slackThreadTsSchema,
          parent_user_id: slackParentUserIdSchema,
        },
        required: [
          "type",
          "user",
          "text",
          "ts",
          "channel",
          "event_ts",
          "team",
          "app_id",
        ], // client_msg_id is optional, blocks are optional, channel_type might not always be there for all channel types if Slack's API is inconsistent. bot_id, thread_ts, parent_user_id are also optional.
      },
    },
  },
};

export const reactionsSubscription: AppBlock = {
  name: "Reactions Subscription",
  description:
    "Subscribes to reaction add and remove events on Slack messages.",
  category: "Reactions",
  async onInternalMessage(input) {
    const slackEvent = input.message.body;
    if (
      slackEvent &&
      (slackEvent.type === "reaction_added" ||
        slackEvent.type === "reaction_removed")
    ) {
      console.log("Received Slack reaction event:", slackEvent);
      await events.emit(slackEvent);
    } else {
      console.warn(
        "reactionsSubscription received unexpected internal message:",
        slackEvent,
      );
    }
  },
  outputs: {
    default: {
      name: "On Reaction",
      description:
        "Emitted when a reaction is added or removed. Contains the Slack reaction event payload.",
      type: {
        type: "object",
        description:
          "Payload of a Slack 'reaction_added' or 'reaction_removed' event. See https://api.slack.com/events/reaction_added and https://api.slack.com/events/reaction_removed for more details.",
        properties: {
          type: {
            type: "string",
            enum: ["reaction_added", "reaction_removed"],
            description:
              "The specific type of event. Will be either 'reaction_added' or 'reaction_removed'.",
          },
          user: slackUserIdSchema,
          reaction: {
            type: "string",
            description:
              "The emoji name of the reaction (without colons, e.g., 'thumbsup').",
          },
          item_user: {
            ...slackUserIdSchema,
            description:
              "The user ID of the author of the message that was reacted to.",
          },
          item: {
            type: "object",
            description: "Information about the item that was reacted to.",
            properties: {
              type: {
                type: "string",
                description: "The type of item (typically 'message').",
              },
              channel: slackChannelIdSchema,
              ts: slackMessageTimestampSchema,
            },
            required: ["type", "channel", "ts"],
          },
          event_ts: slackEventTsSchema,
          team: slackTeamIdSchema,
        },
        required: [
          "type",
          "user",
          "reaction",
          "item_user",
          "item",
          "event_ts",
          "team",
        ],
      },
    },
  },
};

export const messagesSubscription: AppBlock = {
  name: "Messages Subscription",
  description:
    "Subscribes to messages in Slack channels, optionally filtered by specific channel.",
  category: "Messaging",
  config: {
    channelId: {
      name: "Channel ID (Optional)",
      description:
        "If specified, only messages from this channel will be received. Leave empty to receive messages from all channels the app has access to.",
      type: "string",
      required: false,
    },
    includeOwnMessages: {
      name: "Include Own Messages",
      description:
        "If true, the app will also receive messages it posts itself. If false, it will only receive messages from other users.",
      type: "boolean",
      default: false,
      required: false,
    },
  },
  async onInternalMessage({ app, block, message }) {
    const slackEvent = message.body;
    if (slackEvent && slackEvent.type === "message") {
      // Check if we should filter by channel
      const configuredChannelId = block.config.channelId;
      if (configuredChannelId && slackEvent.channel !== configuredChannelId) {
        console.error(
          "Message unexpectedly received from a different channel: ",
          slackEvent.channel,
        );
        return;
      }

      // Skip this event if it's from the app itself and we are not including own messages
      if (
        app.signals.userId === slackEvent.user &&
        !block.config.includeOwnMessages
      ) {
        return;
      }

      await events.emit(slackEvent);
    } else {
      console.warn(
        "messagesSubscription received unexpected internal message:",
        slackEvent,
      );
    }
  },
  outputs: {
    default: {
      name: "On Message",
      description:
        "Emitted when a message is posted. Contains the Slack message event payload.",
      type: {
        type: "object",
        description:
          "Payload of a Slack 'message' event. See https://api.slack.com/events/message for more details.",
        properties: {
          type: {
            type: "string",
            enum: ["message"],
            description:
              "The specific type of event. For this block, it will always be 'message'.",
          },
          user: slackUserIdSchema,
          text: slackMessageTextSchema,
          ts: slackMessageTimestampSchema,
          channel: slackChannelIdSchema,
          event_ts: slackEventTsSchema,
          team: slackTeamIdSchema,
          client_msg_id: {
            ...slackClientMsgIdSchema,
            description:
              "A unique identifier for the message, sent by the client. Only present for user-posted messages.",
          },
          blocks: slackBlocksSchema,
          channel_type: slackChannelTypeSchema,
          bot_id: {
            ...slackBotIdSchema,
            description:
              "Optional. The bot ID, if the message was posted by a bot user.",
          },
          app_id: {
            ...slackAppIdSchema,
            description:
              "Optional. The ID of the application that posted the message, if posted by a bot/app.",
          },
          thread_ts: slackThreadTsSchema,
          parent_user_id: slackParentUserIdSchema,
          subtype: {
            type: "string",
            description:
              "Optional. Indicates a subtype of message, e.g., 'bot_message', 'channel_join', etc.",
          },
        },
        required: ["type", "text", "ts", "channel", "event_ts", "team"],
      },
    },
  },
};
