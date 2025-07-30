import { AppBlock } from "@slflows/sdk/v1";
import { callSlackApi } from "../slackClient.ts";

export const authMetadata: AppBlock = {
  name: "Auth Metadata",
  description:
    "Gets authentication metadata for the configured bot token, including team and user information.",
  category: "Auth",
  signals: {
    url: {
      name: "Workspace URL",
      description: "The workspace URL.",
    },
    team: {
      name: "Workspace Name",
      description: "The workspace name.",
    },
    user: {
      name: "User Name",
      description:
        "The authenticated user's name (typically 'bot' for bot tokens).",
    },
    team_id: {
      name: "Workspace ID",
      description: "The workspace ID.",
    },
    user_id: {
      name: "User ID",
      description: "The authenticated user's ID.",
    },
    bot_id: {
      name: "Bot ID",
      description: "The bot ID (only present for bot tokens).",
    },
  },
  async onSync(input) {
    const { slackBotToken } = input.app.config;

    if (!slackBotToken) {
      return {
        newStatus: "failed",
        customStatusDescription: "Slack Bot Token not configured in the app.",
      };
    }

    const responseData = await callSlackApi("auth.test", {}, slackBotToken);

    return {
      signalUpdates: {
        url: responseData.url,
        team: responseData.team,
        user: responseData.user,
        team_id: responseData.team_id,
        user_id: responseData.user_id,
        bot_id: responseData.bot_id || null,
      },
      newStatus: "ready",
    };
  },
};
