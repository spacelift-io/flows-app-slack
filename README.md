# Slack

## Description

App for general Slack usage.

For now doesn't cover 100% of the raw API (we might want to generate that at some point instead of manually implementing?).

## Config

The config contains an appToken, which is used for authentication.

When confirmed, if the appToken is there, the app installation will just switch to the `ready` status.

Otherwise, it will create a prompt, that will allow creating a slack app using a slack manifest URL, with stuff like a properly configured callback url for events and interactions, based on the app's HTTP endpoint. Then, the user will have to fill out the appToken accordingly. Once the appToken is filled out, the prompt is completed, and the installation will switch to the `ready` status.

## App Services

The app needs to expose an HTTP endpoint to handle Events API and Interaction callbacks. Those webhooks must be properly verified.

## Blocks

- `sendTextMessage`
  - Description: Sends a simple markdown-formatted text message to a Slack channel or DM. No custom blocks. Can optionally be a thread reply.
  - Implementation: Raw API call.
- `sendMessageBlocks`
  - Description: Sends a message to a Slack channel or DM, with a json list of blocks as inputs.
  - Implementation: Raw API call. Can optionally be a thread reply.
- `sendEphemeralMessageBlocks`
  - Description: Sends a message to a Slack channel or DM, with a json list of blocks as inputs. The message is ephemeral (only visible to a select user).
  - Implementation: Raw API call.
- `sendMessageWithInteractions`
  - Description: Sends a message to a Slack channel, with a json list of blocks as inputs. It may contain interactive elements (buttons, select menus, etc.). The block has two outputs, one for when the message is sent, and then one for message interactions.
  - Implementation: Stores an app-level keyvalue with metadata (blockId, original produced eventId) keyed by the sent slack message id. When the app receives interaction HTTP callbacks, it will look for the message related to the callback in the keyvalue store, and use internal messaging to notify the right block about it. That block will then produce the interaction event.
- `updateMessageBlocks`
  - Description: Updates a message by its id, with a json list of blocks as inputs.
  - Implementation: Raw API call.
- `deleteMessage`
  - Description: Deletes a message by its id.
  - Implementation: Raw API call.
- Messages Subscription
  - Description: Subscribes to messages, optionally limited to e.g. a specific channel.
  - Implementation: The central app endpoint will receive callbacks from the Slack Events API. It should find subscription blocks relevant to a given event (by type, and optional static config like channel) and notify them. The subscription block will then produce the event.
- App Mention Subscription
  - Description: Subscribes to app mentions.
  - Implementation: Same as messages subscription.
- Reactions Subscription
  - Description: Subscribes to reaction add and remove.
  - Implementation: Same as messages subscription.
- Raw reaction management blocks (get for message, remove)
  - Description: Raw API calls to manage reactions.
  - Implementation: Raw API call.
- Raw channel management blocks (create, delete, archive, unarchive, etc.)
  - Description: Raw API calls to manage channels.
  - Implementation: Raw API call.
- Raw user group management blocks (create, delete, archive, unarchive, etc.)
  - Description: Raw API calls to manage user groups.
  - Implementation: Raw API call.

## Implementation Notes

Most blocks should operate on raw HTTP endpoints. Webhook verification should ideally use a library.

## Testing

You will need the test utilities app, as well as the Slack app. To install the Slack app just confirm it without filling out any options, then follow the instructions on the prompt.

Import the scenario, attach the blocks to app installations, and confirm any resources, filling out the Variables block with your Slack user id (you can get it by opening the DM with yourself, clicking the portrait, and on the profile that opens, clicking the three dots, and then "Copy member ID").

Then you can run the scenario. Some parts need to be triggered manually, others are based on subscriptions.
