import { defineApp, http, kv, lifecycle } from "@slflows/sdk/v1";

import sendTextMessage from "./blocks/sendTextMessage.ts";
import {
  appMentionSubscription,
  messagesSubscription,
  reactionsSubscription,
} from "./blocks/subscriptions.ts";
import {
  handleEventsEndpoint,
  handleInteractivityEndpoint,
  verifySlackRequest,
} from "./httpHandlerHelpers.ts";
import sendMessageBlocks from "./blocks/sendMessageBlocks.ts";
import sendEphemeralMessageBlocks from "./blocks/sendEphemeralMessageBlocks.ts";
import updateMessageBlocks from "./blocks/updateMessageBlocks.ts";
import deleteMessage from "./blocks/deleteMessage.ts";
import sendMessageWithInteractions from "./blocks/sendMessageWithInteractions.ts";
import {
  addReaction,
  getReactions,
  removeReaction,
} from "./blocks/reactions.ts";
import {
  getUserInfo,
  listUserGroupUsers,
  updateUserGroupUsers,
} from "./blocks/users.ts";
import {
  archiveChannel,
  createChannel,
  getChannelInfo,
  inviteUsersToChannel,
  kickUsersFromChannel,
  setChannelPurpose,
  setChannelTopic,
  unarchiveChannel,
} from "./blocks/channels.ts";
import { authMetadata } from "./blocks/auth.ts";
import { openViewWithInteractions } from "./blocks/views.ts";
import { conversation } from "./blocks/conversation.ts";
import { botThread } from "./blocks/botThread.ts";

export const app = defineApp({
  name: "Slack",
  installationInstructions:
    "To connect your Slack workspace:\n1. **Use an existing Slack App**: Fill in the 'Slack Bot Token' and 'Slack Signing Secret' fields below with your app's credentials, then confirm the installation.\n2. **Create a new Slack App**: Leave the token and secret fields blank. After you click 'Confirm', you will be guided through creating a new Slack app using a pre-configured manifest. You'll then copy the generated token and secret back into this configuration.",
  config: {
    slackBotToken: {
      name: "Slack Bot Token (xoxb-)",
      description:
        "The Bot User OAuth Token for your Slack app (starts with 'xoxb-').",
      type: "string",
      sensitive: true,
      required: false, // Becomes effectively required for 'ready' state by onSync
    },
    slackSigningSecret: {
      name: "Slack Signing Secret",
      description:
        "The Signing Secret for your Slack app, used to verify incoming requests.",
      type: "string",
      sensitive: true,
      required: false, // Becomes effectively required for 'ready' state by onSync
    },
  },

  signals: {
    botId: {
      name: "Bot ID",
      description: "The ID of the bot user associated with this app.",
    },
    userId: {
      name: "User ID",
      description: "The ID of the bot user in Slack.",
    },
  },

  async onSync(input) {
    const { slackBotToken, slackSigningSecret } = input.app.config;

    if (slackBotToken && slackSigningSecret) {
      try {
        const response = await fetch("https://slack.com/api/auth.test", {
          method: "POST", // auth.test is a GET, but can be called as POST with token in header
          headers: {
            Authorization: `Bearer ${slackBotToken}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (data.ok) {
          const oldPromptKv = await kv.app.get("configPromptId");
          if (oldPromptKv && oldPromptKv.value) {
            try {
              await lifecycle.prompt.delete(oldPromptKv.value as string);
            } catch (e: any) {
              console.warn(
                `Failed to delete old prompt ${oldPromptKv.value}: ${e.message}`,
              );
            }
            await kv.app.delete(["configPromptId"]);
          }
          return {
            newStatus: "ready",
            signalUpdates: {
              botId: data.bot_id,
              userId: data.user_id,
            },
          };
        } else {
          const errorMessage = `Slack auth.test failed: ${data.error || "Unknown error"}. Please check your Bot Token.`;
          console.error(errorMessage);
          return {
            newStatus: "failed",
            customStatusDescription: "Slack auth failed.",
          };
        }
      } catch (error: any) {
        const errorMessage = `Error during Slack auth.test: ${error.message}`;
        console.error(errorMessage);
        return {
          newStatus: "failed",
          customStatusDescription: "Auth test error.",
        };
      }
    } else {
      let promptId = (await kv.app.get("configPromptId"))?.value as
        | string
        | undefined;

      const eventsUrl = `${input.app.http.url}/events`;
      const interactivityUrl = `${input.app.http.url}/interactivity`;

      const slackManifest = {
        _metadata: {
          major_version: 1,
          minor_version: 2,
        },
        display_information: {
          name: "Spacelift Flows Integration",
          description: "Integration with Spacelift Flows for Slack",
          background_color: "#2E2D2D",
        },
        features: {
          bot_user: {
            display_name: "Spacelift Flows Bot",
            always_online: false,
          },
          app_home: {
            home_tab_enabled: false,
            messages_tab_enabled: true,
            messages_tab_read_only_enabled: true,
          },
        },
        oauth_config: {
          scopes: {
            bot: [
              "app_mentions:read",
              "chat:write",
              "chat:write.public", // For ephemeral messages in public channels
              "channels:history", // For message subscriptions in public channels
              "groups:history", // For message subscriptions in private channels
              "im:history", // For message subscriptions in DMs
              "mpim:history", // For message subscriptions in multi-person DMs
              "reactions:write", // For adding/removing reactions
              "reactions:read", // For getting reactions and reaction subscriptions
              "usergroups:write", // For updating user group membership
              "usergroups:read", // For listing user group users
              "channels:manage", // For creating, archiving, managing public channels
              "groups:write", // For managing private channels
              "channels:read", // For getting public channel info
              "groups:read", // For getting private channel info
              "users:read", // For getting user info
            ],
          },
        },
        settings: {
          event_subscriptions: {
            request_url: eventsUrl,
            bot_events: [
              "app_mention",
              "reaction_added",
              "reaction_removed",
              "message.channels",
              "message.groups",
              "message.im",
              "message.mpim",
            ],
          },
          interactivity: {
            is_enabled: true,
            request_url: interactivityUrl,
          },
          org_deploy_enabled: false,
          socket_mode_enabled: false,
        },
      };

      const manifestJsonString = JSON.stringify(slackManifest);
      const encodedManifest = encodeURIComponent(manifestJsonString);
      const slackAppCreationUrl = `https://api.slack.com/apps?new_app=1&manifest_json=${encodedManifest}`;

      const promptDescription = `
To complete the Slack app setup:
1.  The "Create Slack App" button/link below will take you to Slack with the app manifest pre-filled.
2.  Review the manifest and click "**Next**", then "**Create**".
3.  **Install App**: On the next page, click "**Install to Workspace**" and authorize.
4.  **Get Bot Token**: Navigate to "OAuth & Permissions" (under Features in the sidebar). Copy the "**Bot User OAuth Token**" (it starts with \`xoxb-\`).
5.  **Get Signing Secret**: Navigate to "Basic Information" (under Settings in the sidebar). Scroll down to "App Credentials" and copy the "**Signing Secret**".
6.  **Update Configuration**: Paste the "Bot User OAuth Token" and "Signing Secret" into this Spacelift App's configuration fields and save.
`;
      if (!promptId) {
        promptId = await lifecycle.prompt.create(promptDescription, {
          redirect: {
            url: slackAppCreationUrl,
            method: "GET",
          },
        });
        await kv.app.set({ key: "configPromptId", value: promptId });
      }
      return {
        newStatus: "in_progress",
        customStatusDescription: "Please follow the prompt.",
      };
    }
  },
  http: {
    async onRequest(input) {
      const { slackSigningSecret } = input.app.config;
      const requestPath = input.request.path;

      if (!slackSigningSecret) {
        console.error(
          "Slack app not configured with Signing Secret. Cannot verify webhook.",
        );
        await http.respond(input.request.requestId, {
          statusCode: 500,
          body: { error: "App not configured: Missing Signing Secret" },
        });
        return;
      }

      const isValid = await verifySlackRequest(
        input.request,
        slackSigningSecret,
      );
      if (!isValid) {
        console.warn(
          "Invalid Slack signature for request:",
          input.request.requestId,
          "on path:",
          requestPath,
        );
        await http.respond(input.request.requestId, {
          statusCode: 403,
          body: { error: "Invalid Slack signature" },
        });
        return;
      }

      // Route based on path
      if (requestPath === "/events" || requestPath.endsWith("/events")) {
        const response = await handleEventsEndpoint(input.request.body);
        await http.respond(input.request.requestId, response);
      } else if (
        requestPath === "/interactivity" ||
        requestPath.endsWith("/interactivity")
      ) {
        // Interactivity event payloads are json-serialized strings.
        const payload = JSON.parse(input.request.body.payload);
        const response = await handleInteractivityEndpoint(payload);
        await http.respond(input.request.requestId, response);
      } else {
        console.warn("Received request on unhandled HTTP path:", requestPath);
        await http.respond(input.request.requestId, {
          statusCode: 404,
          body: { error: "Endpoint not found" },
        });
      }
    },
  },
  blocks: {
    // Auth
    authMetadata: authMetadata,

    // Messaging
    sendTextMessage: sendTextMessage,
    sendMessageBlocks: sendMessageBlocks,
    sendEphemeralMessageBlocks: sendEphemeralMessageBlocks,
    updateMessageBlocks: updateMessageBlocks,
    deleteMessage: deleteMessage,
    sendMessageWithInteractions: sendMessageWithInteractions,
    messagesSubscription: messagesSubscription,
    appMentionSubscription: appMentionSubscription,

    // Reactions
    addReaction: addReaction,
    removeReaction: removeReaction,
    getReactions: getReactions,
    reactionsSubscription: reactionsSubscription,

    // User Groups
    updateUserGroupUsers: updateUserGroupUsers,
    listUserGroupUsers: listUserGroupUsers,

    // Users
    getUserInfo: getUserInfo,

    // Channels
    createChannel: createChannel,
    archiveChannel: archiveChannel,
    unarchiveChannel: unarchiveChannel,
    getChannelInfo: getChannelInfo,
    setChannelTopic: setChannelTopic,
    setChannelPurpose: setChannelPurpose,
    inviteUsersToChannel: inviteUsersToChannel,
    kickUsersFromChannel: kickUsersFromChannel,

    // Views
    openViewWithInteractions,

    // Conversations
    conversation,
    botThread,
  },
});
