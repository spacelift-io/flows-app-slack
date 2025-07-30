import {
  slackUserIdSchema,
  slackTeamIdSchema,
} from "../jsonschema/jsonschema.ts";

import { AppBlock, events, kv } from "@slflows/sdk/v1";

import { callSlackApi } from "../slackClient.ts";

export const openViewWithInteractions: AppBlock = {
  name: "Open View With Interactions",
  description:
    "Opens a modal view with Block Kit blocks and listens for user interactions (form submissions, view closed events).",
  category: "Views",
  inputs: {
    default: {
      name: "Open",
      description: "Trigger opening the interactive view.",
      config: {
        triggerId: {
          name: "Trigger ID",
          description:
            "The trigger_id received from a Slack interaction (button click, slash command, etc.). Required to open a modal.",
          type: "string",
          required: true,
        },
        title: {
          name: "Title",
          description: "The title text of the modal (max 24 characters).",
          type: "string",
          required: true,
          default: "Title",
        },
        blocks: {
          name: "Blocks",
          description: "Array of Block Kit blocks to display in the modal.",
          type: {
            type: "array",
            items: {
              type: "object",
            },
          },
          required: true,
        },
        submit: {
          name: "Submit Button Text",
          description: "Optional submit button text (max 24 characters).",
          type: "string",
          required: false,
        },
        close: {
          name: "Close Button Text",
          description: "Optional close button text (max 24 characters).",
          type: "string",
          required: false,
        },
        callbackId: {
          name: "Callback ID",
          description:
            "An identifier you can use to identify this particular view.",
          type: "string",
          required: false,
        },
        privateMetadata: {
          name: "Private Metadata",
          description:
            "Private data that will be passed to interaction payloads (max 3000 characters).",
          type: "string",
          required: false,
        },
        clearOnClose: {
          name: "Clear on Close",
          description:
            "When true, clicking the close button will clear all views in the modal stack.",
          type: "boolean",
          required: false,
        },
        notifyOnClose: {
          name: "Notify on Close",
          description:
            "When true, Slack will send a view_closed event when the modal is closed.",
          type: "boolean",
          required: false,
        },
        externalId: {
          name: "External ID",
          description:
            "A unique external ID for the view (max 255 characters).",
          type: "string",
          required: false,
        },
      },
      async onEvent(input) {
        const { slackBotToken } = input.app.config;
        const {
          triggerId,
          title,
          blocks,
          submit,
          close,
          callbackId,
          privateMetadata,
          clearOnClose,
          notifyOnClose,
          externalId,
        } = input.event.inputConfig;

        if (!slackBotToken) {
          throw new Error(
            "Slack Bot Token not configured in the app. Cannot open view.",
          );
        }

        // Build the view object
        const view: any = {
          type: "modal",
          title: {
            type: "plain_text",
            text: title,
          },
          blocks: blocks,
        };

        // Add optional fields
        if (submit) {
          view.submit = {
            type: "plain_text",
            text: submit,
          };
        }
        if (close) {
          view.close = {
            type: "plain_text",
            text: close,
          };
        }
        if (callbackId) view.callback_id = callbackId;
        if (privateMetadata) view.private_metadata = privateMetadata;
        if (clearOnClose !== undefined) view.clear_on_close = clearOnClose;
        if (notifyOnClose !== undefined) view.notify_on_close = notifyOnClose;
        if (externalId) view.external_id = externalId;

        const slackApiPayload = {
          trigger_id: triggerId,
          view: JSON.stringify(view), // views.open requires the view to be JSON-encoded
        };

        const responseData = await callSlackApi(
          "views.open",
          slackApiPayload,
          slackBotToken,
        );

        // Store interaction metadata for this view
        const viewId = responseData.view.id;
        await kv.app.set({
          key: `view:${viewId}`,
          value: {
            blockId: input.block.id,
            originalEventId: input.event.id,
          },
        });

        await events.emit(
          {
            view: responseData.view,
          },
          { outputKey: "opened" },
        );
      },
    },
  },
  async onInternalMessage(input) {
    // Handle view interactions routed from the app's HTTP handler
    const messageBody = input.message.body;

    if (messageBody.type === "slack_view_interaction") {
      const { payload, originalEventId } = messageBody;

      await events.emit(
        {
          type: payload.type,
          user: payload.user,
          api_app_id: payload.api_app_id,
          token: payload.token,
          trigger_id: payload.trigger_id,
          team: payload.team,
          enterprise: payload.enterprise,
          is_enterprise_install: payload.is_enterprise_install,
          view: payload.view,
          response_urls: payload.response_urls,
          actions: payload.actions,
        },
        {
          outputKey: "interaction",
          parentEventId: originalEventId,
        },
      );
    }
  },
  outputs: {
    opened: {
      name: "View Opened",
      description: "Emitted when the modal view has been successfully opened.",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          view: {
            type: "object",
            description: "The opened view object as returned by Slack.",
            properties: {
              id: {
                type: "string",
                description: "The unique ID of the view.",
              },
              team_id: slackTeamIdSchema,
              type: {
                type: "string",
                enum: ["modal"],
                description: "The type of view.",
              },
              title: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  text: { type: "string" },
                },
              },
              blocks: {
                type: "array",
                description: "The blocks that were rendered in the view.",
                items: { type: "object" },
              },
              private_metadata: {
                type: "string",
                description: "The private metadata that was included.",
              },
              callback_id: {
                type: "string",
                description: "The callback ID if one was provided.",
              },
              state: {
                type: "object",
                description:
                  "The current state of the view's interactive components.",
                properties: {
                  values: {
                    type: "object",
                    description: "Map of block IDs to their current values.",
                  },
                },
              },
              hash: {
                type: "string",
                description: "A unique value for this view state.",
              },
              clear_on_close: {
                type: "boolean",
                description: "Whether the view stack clears on close.",
              },
              notify_on_close: {
                type: "boolean",
                description: "Whether view_closed events are sent.",
              },
              root_view_id: {
                type: "string",
                description:
                  "The root view ID if this is part of a view stack.",
              },
              app_id: {
                type: "string",
                description: "The app ID that opened the view.",
              },
              bot_id: {
                type: "string",
                description: "The bot ID associated with the app.",
              },
              external_id: {
                type: "string",
                description: "The external ID if one was provided.",
              },
            },
            required: [
              "id",
              "team_id",
              "type",
              "title",
              "blocks",
              "state",
              "hash",
            ],
          },
        },
        required: ["view"],
      },
    },
    interaction: {
      name: "View Interaction",
      description:
        "Emitted when a user interacts with the view (submits form, closes modal, etc.).",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        description:
          "Slack view interaction payload containing details about the user action.",
        properties: {
          type: {
            type: "string",
            enum: ["view_submission", "view_closed"],
            description: "The type of view interaction.",
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
          api_app_id: {
            type: "string",
            description: "The app ID of the app that opened the view.",
          },
          token: {
            type: "string",
            description:
              "A verification token (deprecated, use signing secret instead).",
          },
          trigger_id: {
            type: "string",
            description:
              "A temporary token that can be used to open another modal.",
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
          view: {
            type: "object",
            description: "The view object at the time of interaction.",
            properties: {
              id: { type: "string", description: "The view ID." },
              type: { type: "string", enum: ["modal"] },
              title: { type: "object" },
              blocks: { type: "array", items: { type: "object" } },
              private_metadata: { type: "string" },
              callback_id: { type: "string" },
              state: {
                type: "object",
                description: "The submitted form values (for view_submission).",
                properties: {
                  values: { type: "object" },
                },
              },
              hash: { type: "string" },
              clear_on_close: { type: "boolean" },
              notify_on_close: { type: "boolean" },
              external_id: { type: "string" },
            },
            required: ["id", "type", "state", "hash"],
          },
          response_urls: {
            type: "array",
            description:
              "Array of response URLs that can be used to send messages.",
            items: {
              type: "object",
              properties: {
                response_url: { type: "string" },
                channel_id: { type: "string" },
              },
            },
          },
        },
        required: ["type", "user", "api_app_id", "token", "team", "view"],
      },
    },
  },
} satisfies AppBlock;
