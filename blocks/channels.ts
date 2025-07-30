import {
  slackChannelIdSchema,
  slackUserIdSchema,
} from "../jsonschema/jsonschema.ts";

import { AppBlock, events } from "@slflows/sdk/v1";

import { callSlackApi } from "../slackClient.ts";

export const createChannel: AppBlock = {
  name: "Create Channel",
  description: "Creates a new Slack channel (public or private).",
  category: "Channels",
  inputs: {
    default: {
      name: "Create",
      description: "Trigger creating a new channel.",
      config: {
        name: {
          name: "Channel Name",
          description:
            "Name of the channel to create. Must be lowercase, without spaces or periods, and shorter than 22 characters.",
          type: "string",
          required: true,
        },
        isPrivate: {
          name: "Private Channel",
          description:
            "If true, creates a private channel. If false, creates a public channel.",
          type: "boolean",
          required: false,
          default: false,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { name, isPrivate } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot create channel.",
          );
        }

        const slackApiPayload: Record<string, any> = {
          name: name,
          is_private: isPrivate || false,
        };

        const responseData = await callSlackApi(
          "conversations.create",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          channel: responseData.channel,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Channel Created",
      description: "Emitted when the channel has been successfully created.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: {
            type: "object",
            description: "The created channel object.",
            properties: {
              id: slackChannelIdSchema,
              name: {
                type: "string",
                description: "The name of the created channel.",
              },
              is_channel: {
                type: "boolean",
                description: "True if this is a public channel.",
              },
              is_group: {
                type: "boolean",
                description: "True if this is a private channel.",
              },
              is_private: {
                type: "boolean",
                description: "True if this is a private channel.",
              },
              created: {
                type: "number",
                description: "Unix timestamp when the channel was created.",
              },
              creator: slackUserIdSchema,
            },
            required: [
              "id",
              "name",
              "is_channel",
              "is_group",
              "is_private",
              "created",
              "creator",
            ],
          },
        },
        required: ["channel"],
      },
    },
  },
};

export const archiveChannel: AppBlock = {
  name: "Archive Channel",
  description: "Archives a Slack channel.",
  category: "Channels",
  inputs: {
    default: {
      name: "Archive",
      description: "Trigger archiving the specified channel.",
      config: {
        channelId: {
          name: "Channel ID",
          description: "ID of the channel (e.g., C0123ABC) to archive.",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot archive channel.",
          );
        }

        const slackApiPayload = {
          channel: channelId,
        };

        await callSlackApi(
          "conversations.archive",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          channel: channelId,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Channel Archived",
      description: "Emitted when the channel has been successfully archived.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
        },
        required: ["channel"],
      },
    },
  },
};

export const unarchiveChannel: AppBlock = {
  name: "Unarchive Channel",
  description: "Unarchives a Slack channel.",
  category: "Channels",
  inputs: {
    default: {
      name: "Unarchive",
      description: "Trigger unarchiving the specified channel.",
      config: {
        channelId: {
          name: "Channel ID",
          description: "ID of the channel (e.g., C0123ABC) to unarchive.",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot unarchive channel.",
          );
        }

        const slackApiPayload = {
          channel: channelId,
        };

        await callSlackApi(
          "conversations.unarchive",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          channel: channelId,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Channel Unarchived",
      description: "Emitted when the channel has been successfully unarchived.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
        },
        required: ["channel"],
      },
    },
  },
};

export const getChannelInfo: AppBlock = {
  name: "Get Channel Info",
  description: "Gets information about a Slack channel.",
  category: "Channels",
  inputs: {
    default: {
      name: "Get",
      description: "Trigger getting information about the specified channel.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) to get information about.",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot get channel info.",
          );
        }

        const responseData = await callSlackApi(
          "conversations.info",
          { channel: channelId },
          slackBotToken,
          "form", // Use form-urlencoded for conversations.info
        );

        await events.emit({
          channel: responseData.channel,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Channel Info Retrieved",
      description:
        "Emitted when channel information has been successfully retrieved.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: {
            type: "object",
            description: "The channel object with detailed information.",
            properties: {
              id: slackChannelIdSchema,
              name: {
                type: "string",
                description: "The name of the channel.",
              },
              is_channel: {
                type: "boolean",
                description: "True if this is a public channel.",
              },
              is_group: {
                type: "boolean",
                description: "True if this is a private channel.",
              },
              is_im: {
                type: "boolean",
                description: "True if this is a direct message.",
              },
              is_private: {
                type: "boolean",
                description: "True if this is a private channel.",
              },
              is_archived: {
                type: "boolean",
                description: "True if the channel is archived.",
              },
              is_general: {
                type: "boolean",
                description: "True if this is the general channel.",
              },
              num_members: {
                type: "number",
                description: "Number of members in the channel.",
              },
              topic: {
                type: "object",
                description: "Channel topic information.",
                properties: {
                  value: {
                    type: "string",
                    description: "The topic text.",
                  },
                  creator: slackUserIdSchema,
                  last_set: {
                    type: "number",
                    description: "Unix timestamp when topic was last set.",
                  },
                },
              },
              purpose: {
                type: "object",
                description: "Channel purpose information.",
                properties: {
                  value: {
                    type: "string",
                    description: "The purpose text.",
                  },
                  creator: slackUserIdSchema,
                  last_set: {
                    type: "number",
                    description: "Unix timestamp when purpose was last set.",
                  },
                },
              },
              created: {
                type: "number",
                description: "Unix timestamp when the channel was created.",
              },
              creator: slackUserIdSchema,
            },
            required: [
              "id",
              "name",
              "is_channel",
              "is_group",
              "is_im",
              "is_private",
              "is_archived",
              "created",
            ],
          },
        },
        required: ["channel"],
      },
    },
  },
};

export const setChannelTopic: AppBlock = {
  name: "Set Channel Topic",
  description: "Sets the topic for a Slack channel.",
  category: "Channels",
  inputs: {
    default: {
      name: "Set",
      description: "Trigger setting the topic for the specified channel.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) to set the topic for.",
          type: "string",
          required: true,
        },
        topic: {
          name: "Topic",
          description: "The new topic for the channel.",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, topic } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot set channel topic.",
          );
        }

        const slackApiPayload = {
          channel: channelId,
          topic: topic,
        };

        const responseData = await callSlackApi(
          "conversations.setTopic",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          channel: channelId,
          topic: responseData.topic,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Topic Set",
      description: "Emitted when the channel topic has been successfully set.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
          topic: {
            type: "string",
            description: "The topic that was set for the channel.",
          },
        },
        required: ["channel", "topic"],
      },
    },
  },
};

export const setChannelPurpose: AppBlock = {
  name: "Set Channel Purpose",
  description: "Sets the purpose for a Slack channel.",
  category: "Channels",
  inputs: {
    default: {
      name: "Set",
      description: "Trigger setting the purpose for the specified channel.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) to set the purpose for.",
          type: "string",
          required: true,
        },
        purpose: {
          name: "Purpose",
          description: "The new purpose for the channel.",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, purpose } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot set channel purpose.",
          );
        }

        const slackApiPayload = {
          channel: channelId,
          purpose: purpose,
        };

        const responseData = await callSlackApi(
          "conversations.setPurpose",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          channel: channelId,
          purpose: responseData.purpose,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Purpose Set",
      description:
        "Emitted when the channel purpose has been successfully set.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
          purpose: {
            type: "string",
            description: "The purpose that was set for the channel.",
          },
        },
        required: ["channel", "purpose"],
      },
    },
  },
};

export const inviteUsersToChannel: AppBlock = {
  name: "Invite Users to Channel",
  description: "Invites users to a Slack channel.",
  category: "Channels",
  inputs: {
    default: {
      name: "Invite",
      description: "Trigger inviting users to the specified channel.",
      config: {
        channelId: {
          name: "Channel ID",
          description: "ID of the channel (e.g., C0123ABC) to invite users to.",
          type: "string",
          required: true,
        },
        users: {
          name: "User IDs",
          description:
            'Array of user IDs (e.g., ["U0123ABC", "U0456DEF"]) to invite to the channel.',
          type: {
            type: "array",
            items: {
              type: "string",
            },
          },
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, users } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot invite users to channel.",
          );
        }

        const slackApiPayload = {
          channel: channelId,
          users: users.join(","),
        };

        const responseData = await callSlackApi(
          "conversations.invite",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          channel: responseData.channel,
          users: users,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "Users Invited",
      description:
        "Emitted when users have been successfully invited to the channel.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: {
            type: "object",
            description: "The channel object.",
            properties: {
              id: slackChannelIdSchema,
              name: {
                type: "string",
                description: "The name of the channel.",
              },
            },
            required: ["id"],
          },
          users: {
            type: "array",
            description: "Array of user IDs that were invited.",
            items: {
              type: "string",
            },
          },
        },
        required: ["channel", "users"],
      },
    },
  },
};

export const kickUsersFromChannel: AppBlock = {
  name: "Kick Users from Channel",
  description: "Removes users from a Slack channel.",
  category: "Channels",
  inputs: {
    default: {
      name: "Kick",
      description: "Trigger removing users from the specified channel.",
      config: {
        channelId: {
          name: "Channel ID",
          description:
            "ID of the channel (e.g., C0123ABC) to remove users from.",
          type: "string",
          required: true,
        },
        user: {
          name: "User ID",
          description: "User ID (e.g., U0123ABC) to remove from the channel.",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { channelId, user } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot remove user from channel.",
          );
        }

        const slackApiPayload = {
          channel: channelId,
          user: user,
        };

        await callSlackApi(
          "conversations.kick",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          channel: channelId,
          user: user,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "User Removed",
      description:
        "Emitted when the user has been successfully removed from the channel.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          channel: slackChannelIdSchema,
          user: slackUserIdSchema,
        },
        required: ["channel", "user"],
      },
    },
  },
};
