import { slackUserIdSchema } from "../jsonschema/jsonschema.ts";

import { AppBlock, events } from "@slflows/sdk/v1";

import { callSlackApi } from "../slackClient.ts";

export const updateUserGroupUsers: AppBlock = {
  name: "Update User Group Users",
  description: "Updates the list of users in a user group.",
  category: "User Groups",
  inputs: {
    default: {
      name: "Update Users",
      description: "Trigger updating the user group membership.",
      config: {
        usergroup: {
          name: "User Group ID",
          description: "ID of the user group to update.",
          type: "string",
          required: true,
        },
        users: {
          name: "User IDs",
          description:
            "Array of user IDs to set as members of this user group. This replaces the existing membership.",
          type: {
            type: "array",
            items: { type: "string" },
          },
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { usergroup, users, includeCount } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot update user group users.",
          );
        }

        if (!Array.isArray(users)) {
          throw new Error("Users must be an array of user IDs.");
        }

        const slackApiPayload: Record<string, any> = {
          usergroup: usergroup,
          users: users.join(","),
        };

        if (includeCount !== undefined) {
          slackApiPayload.include_count = true;
        }

        const responseData = await callSlackApi(
          "usergroups.users.update",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          usergroup: responseData.usergroup,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "User Group Users Updated",
      description:
        "Emitted when the user group membership has been successfully updated.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          usergroup: {
            type: "object",
            description: "The updated user group object.",
            properties: {
              id: {
                type: "string",
                description: "The ID of the user group.",
              },
              team_id: {
                type: "string",
                description: "The team ID where this user group exists.",
              },
              name: {
                type: "string",
                description: "The name of the user group.",
              },
              description: {
                type: "string",
                description: "The description of the user group.",
              },
              handle: {
                type: "string",
                description: "The handle/mention name for the user group.",
              },
              users: {
                type: "array",
                items: slackUserIdSchema,
                description:
                  "Array of user IDs that are members of this user group.",
              },
              user_count: {
                type: "number",
                description: "The number of users in this user group.",
              },
              date_create: {
                type: "number",
                description: "Unix timestamp when the user group was created.",
              },
              date_update: {
                type: "number",
                description:
                  "Unix timestamp when the user group was last updated.",
              },
            },
            required: ["id", "team_id", "name", "handle", "users"],
          },
        },
        required: ["usergroup"],
      },
    },
  },
};

export const listUserGroupUsers: AppBlock = {
  name: "List User Group Users",
  description: "Lists all users in a specific user group.",
  category: "User Groups",
  inputs: {
    default: {
      name: "List Users",
      description: "Trigger listing users in the user group.",
      config: {
        usergroup: {
          name: "User Group ID",
          description: "ID of the user group to get users for.",
          type: "string",
          required: true,
        },
        includeDisabled: {
          name: "Include Disabled",
          description: "Whether to include disabled users in the results.",
          type: "boolean",
          required: false,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { usergroup, includeDisabled } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot list user group users.",
          );
        }

        const slackApiPayload: Record<string, any> = {
          usergroup: usergroup,
        };

        if (includeDisabled !== undefined) {
          slackApiPayload.include_disabled = includeDisabled;
        }

        const responseData = await callSlackApi(
          "usergroups.users.list",
          slackApiPayload,
          slackBotToken,
        );

        await events.emit({
          users: responseData.users,
        });
      },
    },
  },
  outputs: {
    default: {
      name: "User Group Users Listed",
      description:
        "Emitted when user group users have been successfully retrieved.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          users: {
            type: "array",
            items: slackUserIdSchema,
            description: "Array of user IDs in the user group.",
          },
        },
        required: ["users"],
      },
    },
  },
};

export const getUserInfo: AppBlock = {
  name: "Get User Info",
  description: "Gets detailed information about a Slack user by their ID.",
  category: "Users",
  inputs: {
    default: {
      name: "Get",
      description: "Trigger getting information about the specified user.",
      config: {
        userId: {
          name: "User ID",
          description:
            "ID of the user (e.g., U0123ABC) to get information about.",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const { userId } = input.event.inputConfig;

        const { user } = await callSlackApi(
          "users.info",
          { user: userId },
          slackBotToken,
          "form", // Use form-urlencoded for users.info
        );

        await events.emit({ user });
      },
    },
  },
  outputs: {
    default: {
      name: "User Info Retrieved",
      description:
        "Emitted when user information has been successfully retrieved.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          user: {
            type: "object",
            description: "The user object with detailed information.",
            properties: {
              id: slackUserIdSchema,
              name: {
                type: "string",
                description: "The username of the user.",
              },
              real_name: {
                type: "string",
                description: "The real name of the user.",
              },
              display_name: {
                type: "string",
                description: "The display name of the user.",
              },
              email: {
                type: "string",
                description: "The email address of the user.",
              },
              is_bot: {
                type: "boolean",
                description: "True if this is a bot user.",
              },
              is_admin: {
                type: "boolean",
                description: "True if the user is an admin.",
              },
              is_owner: {
                type: "boolean",
                description: "True if the user is the workspace owner.",
              },
              is_primary_owner: {
                type: "boolean",
                description: "True if the user is the primary owner.",
              },
              is_restricted: {
                type: "boolean",
                description: "True if the user is a restricted account.",
              },
              is_ultra_restricted: {
                type: "boolean",
                description: "True if the user is an ultra restricted account.",
              },
              deleted: {
                type: "boolean",
                description: "True if the user has been deleted.",
              },
              tz: {
                type: "string",
                description: "The user's timezone identifier.",
              },
              tz_label: {
                type: "string",
                description: "The user's timezone label.",
              },
              tz_offset: {
                type: "number",
                description: "The user's timezone offset in seconds.",
              },
              profile: {
                type: "object",
                description: "The user's profile information.",
                properties: {
                  avatar_hash: {
                    type: "string",
                    description: "Hash of the user's avatar.",
                  },
                  status_text: {
                    type: "string",
                    description: "The user's status text.",
                  },
                  status_emoji: {
                    type: "string",
                    description: "The user's status emoji.",
                  },
                  real_name: {
                    type: "string",
                    description: "The user's real name.",
                  },
                  display_name: {
                    type: "string",
                    description: "The user's display name.",
                  },
                  real_name_normalized: {
                    type: "string",
                    description: "The user's normalized real name.",
                  },
                  display_name_normalized: {
                    type: "string",
                    description: "The user's normalized display name.",
                  },
                  email: {
                    type: "string",
                    description: "The user's email address.",
                  },
                  image_24: {
                    type: "string",
                    description: "URL of the user's 24x24 avatar.",
                  },
                  image_32: {
                    type: "string",
                    description: "URL of the user's 32x32 avatar.",
                  },
                  image_48: {
                    type: "string",
                    description: "URL of the user's 48x48 avatar.",
                  },
                  image_72: {
                    type: "string",
                    description: "URL of the user's 72x72 avatar.",
                  },
                  image_192: {
                    type: "string",
                    description: "URL of the user's 192x192 avatar.",
                  },
                  image_512: {
                    type: "string",
                    description: "URL of the user's 512x512 avatar.",
                  },
                  team: {
                    type: "string",
                    description: "The user's team ID.",
                  },
                },
              },
              updated: {
                type: "number",
                description: "Unix timestamp when the user was last updated.",
              },
            },
            required: ["id", "name", "deleted", "profile"],
          },
        },
        required: ["user"],
      },
    },
  },
};
