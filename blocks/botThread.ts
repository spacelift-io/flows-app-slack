import { AppBlock, events, kv, EventInput } from "@slflows/sdk/v1";
import { callSlackApi } from "../slackClient.ts";
import { messagesSubscription } from "./subscriptions.ts";
import sendMessageBlocks from "./sendMessageBlocks.ts";

export const botThread: AppBlock = {
  name: "Bot Thread",
  description:
    "Bot-initiated thread management. Allows starting a thread with a message " +
    "and continuing the conversation. Tracks replies from users and emits bot " +
    "messages with thread context.",
  category: "Conversations",

  config: {
    channelId: {
      name: "Default Channel ID",
      description: "Default channel ID to use if not specified in inputs.",
      type: "string",
      required: false,
    },
    ttl: {
      name: "Thread TTL",
      description:
        "Time to live for the thread in seconds. " +
        "After this time, the thread will stop tracking replies.",
      type: "number",
      default: 60 * 60 * 24, // 1 day
      required: false,
    },
  },

  inputs: {
    start: {
      name: "Start",
      description: "Start a new thread by posting the first message.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel to post the message to. If not provided, uses the block's default channel.",
          type: "string",
          required: false,
        },
        message: {
          name: "Message",
          description: "The initial message content in Markdown format.",
          type: "string",
          required: true,
        },
      },
      onEvent: handleStart,
    },
    reply: {
      name: "Reply",
      description: "Reply to an existing thread.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel where the thread exists. If not provided, uses the block's default channel.",
          type: "string",
          required: false,
        },
        threadTs: {
          name: "Thread timestamp",
          description: "Timestamp of the thread to reply to.",
          type: "string",
          required: true,
        },
        message: {
          name: "Message",
          description: "The reply message content in Markdown format.",
          type: "string",
          required: true,
        },
      },
      onEvent: handleReply,
    },
  },

  onInternalMessage: async ({ app, message: { body: slackEvent } }) => {
    if (slackEvent.user === app.signals.userId) {
      // Ignore messages from the bot itself
      return;
    }

    // Only process message events in threads we're tracking
    if (slackEvent.type === "message" && slackEvent.thread_ts) {
      const { value: threadTracked } = await kv.block.get(slackEvent.thread_ts);

      if (threadTracked) {
        // This is a user reply in a tracked thread
        await events.emit(slackEvent, { outputKey: "onReply" });
      }
    }
  },

  outputs: {
    onReply: {
      name: "On Reply",
      description:
        "Triggered when a user replies to the thread (not bot messages)",
      default: true,
      type: messagesSubscription.outputs!.default.type,
    },
    onMessage: {
      name: "On Message",
      description: "Triggered when the bot posts a message (start or reply)",
      secondary: true,
      possiblePrimaryParents: ["start", "reply"],
      type: {
        type: "object",
        properties: {
          ...sendMessageBlocks.outputs.default.type.properties,
          start: {
            type: "boolean",
            description:
              "True if this is the starting message of the thread, false for replies",
          },
        },
        required: [
          ...(sendMessageBlocks.outputs.default.type.required || []),
          "start",
        ],
      },
    },
  },
};

async function handleStart(input: EventInput) {
  const { channelId: inputChannelId, message } = input.event.inputConfig;
  const { channelId: blockChannelId } = input.block.config;
  const { slackBotToken } = input.app.config;

  const channelId = inputChannelId || blockChannelId;
  if (!channelId) {
    throw new Error(
      "Channel ID must be provided either in input config or block config.",
    );
  }

  if (!slackBotToken) {
    throw new Error(
      "Slack Bot Token not configured in the app. Cannot send message.",
    );
  }

  // Convert markdown to Slack blocks
  const blocks = [{ type: "section", text: { type: "mrkdwn", text: message } }];

  const responseData = await callSlackApi(
    "chat.postMessage",
    {
      channel: channelId,
      text: message, // Fallback text
      blocks: blocks,
    },
    slackBotToken,
  );

  // Track this thread
  await kv.block.set({
    key: responseData.ts,
    value: true,
    ttl: input.block.config.ttl,
  });

  responseData.thread_ts = responseData.ts; // Set thread_ts to the message ts for consistency

  await events.emit(
    {
      ts: responseData.ts,
      channel: responseData.channel,
      message: responseData.message,
      start: true,
    },
    { outputKey: "onMessage" },
  );
}

async function handleReply(input: EventInput) {
  const {
    channelId: inputChannelId,
    threadTs,
    message,
  } = input.event.inputConfig;
  const { channelId: blockChannelId } = input.block.config;
  const { slackBotToken } = input.app.config;

  const channelId = inputChannelId || blockChannelId;
  if (!channelId) {
    throw new Error(
      "Channel ID must be provided either in input config or block config.",
    );
  }

  if (!slackBotToken) {
    throw new Error(
      "Slack Bot Token not configured in the app. Cannot send message.",
    );
  }

  // Convert markdown to Slack blocks
  const blocks = [{ type: "section", text: { type: "mrkdwn", text: message } }];

  const responseData = await callSlackApi(
    "chat.postMessage",
    {
      channel: channelId,
      text: message, // Fallback text
      blocks: blocks,
      thread_ts: threadTs,
    },
    slackBotToken,
  );

  // Re-track the thread to extend TTL
  await kv.block.set({
    key: threadTs,
    value: true,
    ttl: input.block.config.ttl,
  });

  await events.emit(
    {
      ts: responseData.ts,
      channel: responseData.channel,
      message: responseData.message,
      start: false,
    },
    { outputKey: "onMessage" },
  );
}
