import { AppBlock, events, kv, EventInput } from "@slflows/sdk/v1";
import { callSlackApi } from "../slackClient.ts";
import sendMessageBlocks from "./sendMessageBlocks.ts";
import { messagesSubscription } from "./subscriptions.ts";

export const conversation: AppBlock = {
  name: "Conversation",
  description:
    "High-level abstraction for managing a conversation with " +
    "the bot user. A conversation is started by mentioning the both in a " +
    "channel. The bot will then respond starting a thread, and will " +
    "automatically respond to any messages in the thread, without the need " +
    "to directly mention it again. Optionally, you can turn on reactions " +
    "to indicate message processing status.",
  category: "Conversations",

  config: {
    ttl: {
      name: "Conversation TTL",
      description:
        "Time to live for the conversation in seconds. " +
        "After this time, the conversation will be considered closed and " +
        "the bot will not respond to any messages in the thread.",
      type: "number",
      default: 60 * 60 * 24, // 1 day
      required: false,
    },
    reactions: {
      name: "Reactions",
      description:
        "Enable reactions to indicate message processing status. " +
        "Adds a 'seen' reaction when message is received and a 'response' reaction when bot responds.",
      type: "boolean",
      default: false,
      required: false,
    },
    channelId: {
      name: "Channel ID",
      description:
        "Restrict activity to this specific channel only. " +
        "If set, the bot will only respond to messages and mentions in this channel.",
      type: "string",
      required: false,
    },
  },

  inputs: {
    default: {
      name: "Responses",
      description: "Send here the bot responses to the conversation.",
      config: {
        content: {
          name: "Response content",
          description: "The Slack response text content",
          type: { type: "string" },
          required: true,
        },
      },
      onEvent: handleResponse,
    },
  },

  onInternalMessage: async ({ app, block, message: { body: slackEvent } }) => {
    if (slackEvent.user === app.signals.userId) {
      // Ignore messages from the bot itself
      return;
    }

    // If channel is configured, only process messages from that channel
    if (
      block.config.channelId &&
      slackEvent.channel !== block.config.channelId
    ) {
      console.error(
        "Event unexpectedly received from a different channel: ",
        slackEvent.channel,
      );
      return;
    }

    let emit = false;

    if (slackEvent.type === "message") {
      emit = await handleMessage(slackEvent);
    } else if (slackEvent.type === "app_mention") {
      emit = await handleAppMention(block.config.ttl, slackEvent);

      // Make sure the thread_ts is set, because we want to start a new
      // conversation.
      if (emit) {
        slackEvent.thread_ts = slackEvent.ts;
      }
    } else {
      console.warn(`Unsupported message type: ${slackEvent.type}`);
    }

    if (!emit) {
      return;
    }

    // Add "seen" reaction if reactions are enabled
    if (block.config.reactions) {
      await addReaction(
        app.config.slackBotToken,
        slackEvent.channel,
        slackEvent.ts,
        "eyes",
      );
    }

    await events.emit(slackEvent, { echo: true, outputKey: "onMessage" });
  },

  outputs: {
    onMessage: {
      name: "On Message",
      description: "Triggered when a message is sent in the conversation",
      default: true,
      type: messagesSubscription.outputs!.default.type,
    },
    onResponse: {
      name: "On Response",
      possiblePrimaryParents: ["default"],
      description: "Triggered when a response is sent in the conversation",
      type: sendMessageBlocks.outputs.default.type,
      secondary: true,
    },
  },
};

async function handleMessage({
  subtype,
  thread_ts,
}: {
  subtype: any;
  thread_ts: string;
}): Promise<boolean> {
  // Messages without thread_ts are not part of a conversation.
  // Also, ignore messages with subtypes (e.g., message_deleted, message_changed).
  // This keeps our conversation clean and only processes actual messages.
  if (!thread_ts || subtype !== undefined) {
    return false;
  }

  // If the message is not found in the kv store, it means it's not in a conversation
  // and we should not process it. Conversations are started by mentioning the bot.
  const { value: threadTracked } = await kv.block.get(thread_ts);

  return threadTracked;
}

async function handleAppMention(ttl: any, slackEvent: any): Promise<boolean> {
  const { event_ts, ts, thread_ts } = slackEvent;

  // If the thread_ts is set, it's not a new conversation but a reply in an
  // existing thread. We should not start a new conversation in this case.
  if (thread_ts) {
    return false;
  }

  return await kv.block.set({
    ttl,
    key: ts,
    value: true,
    lock: { id: event_ts },
  });
}

async function handleResponse(input: EventInput) {
  if (!input.event.echo) {
    console.warn("Received non-echo event in a conversation block, ignoring");
    return;
  }

  const { channel, thread_ts, ts: echoTs } = input.event.echo.body;
  const { content: text } = input.event.inputConfig;
  const blocks = [{ type: "markdown", text }];

  const { ts, message } = await callSlackApi(
    "chat.postMessage",
    { channel, text, thread_ts, blocks, mrkdwn: true },
    input.app.config.slackBotToken,
  );

  // Add "response" reaction to the original message if reactions are enabled
  if (input.block.config.reactions) {
    await addReaction(
      input.app.config.slackBotToken,
      channel,
      echoTs,
      "white_check_mark",
    );
  }

  await events.emit({ channel, ts, message }, { outputKey: "onResponse" });
}

async function addReaction(
  token: string,
  channel: string,
  timestamp: string,
  emoji: string,
) {
  try {
    await callSlackApi(
      "reactions.add",
      { channel, timestamp, name: emoji },
      token,
    );
  } catch (error) {
    console.warn(`Failed to add ${emoji} reaction:`, error);
  }
}
