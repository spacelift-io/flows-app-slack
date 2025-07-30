import { HTTPRequest, kv, messaging } from "@slflows/sdk/v1";

import * as nodecrypto from "node:crypto";
import { handleEventSubscriptions } from "./blocks/subscriptions.ts";

// Helper for Slack signature verification
// This might need to be adapted based on the exact crypto primitives available
// and preferred in the Spacelift Flows execution environment.
export async function verifySlackRequest(
  request: HTTPRequest,
  signingSecret: string,
): Promise<boolean> {
  const timestamp = request.headers["X-Slack-Request-Timestamp"];
  const signature = request.headers["X-Slack-Signature"];
  const body = request.rawBody;

  if (!timestamp || !signature) {
    // Body can be empty for some GETs, but Slack POSTs events.
    console.warn("Missing Slack timestamp or signature header.");
    return false;
  }

  // Prevent replay attacks: check if timestamp is within 5 minutes
  const nowSeconds = Math.floor(Date.now() / 1000);
  const requestTimestampSeconds = parseInt(timestamp, 10);
  if (
    isNaN(requestTimestampSeconds) ||
    Math.abs(nowSeconds - requestTimestampSeconds) > 300
  ) {
    console.warn(
      "Slack request timestamp validation failed (too old or too new).",
    );
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const encoder = new TextEncoder();
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(signingSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(sigBasestring),
    );

    const hexMac = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const mySignature = `v0=${hexMac}`;

    return nodecrypto.timingSafeEqual(
      encoder.encode(mySignature),
      encoder.encode(signature),
    );
  } catch (e) {
    console.error("Error during Slack signature verification:", e);
    return false;
  }
}
/// Handle Slack Events API endpoint
export async function handleEventsEndpoint(
  payload: any,
): Promise<{ statusCode: number; body?: any }> {
  if (payload.type === "url_verification") {
    console.log("Handling Slack URL verification challenge for /events.");
    return { statusCode: 200, body: payload.challenge };
  }

  if (payload.type === "event_callback") {
    const event = payload.event;
    console.log(`Received Slack event_callback on /events: ${event.type}`);

    await handleEventSubscriptions(event);

    return { statusCode: 200 };
  }

  console.warn(
    "Received unhandled payload type on /events:",
    payload.type,
    payload,
  );
  return { statusCode: 200 };
}

// Handle Slack Interactivity endpoint
export async function handleInteractivityEndpoint(
  payload: any,
): Promise<{ statusCode: number }> {
  if (
    payload.type === "interactive_message" ||
    payload.type === "block_actions" ||
    payload.type === "view_submission" ||
    payload.type === "view_closed"
  ) {
    console.log(
      `Received Slack interactivity payload on /interactivity: ${payload.type}`,
    );

    // Handle view interactions (view_submission, view_closed)
    if (payload.type === "view_submission" || payload.type === "view_closed") {
      const viewId = payload.view?.id;
      if (viewId) {
        const interactionData = await kv.app.get(`view:${viewId}`);
        if (interactionData && interactionData.value) {
          const { blockId, originalEventId } = interactionData.value as any;
          console.log(
            `Routing view interaction for view ${viewId} to block ${blockId}`,
          );

          await messaging.sendToBlocks({
            blockIds: [blockId],
            body: { type: "slack_view_interaction", payload, originalEventId },
          });
        } else {
          console.warn(`No interaction data found for viewId: ${viewId}`);
        }
      } else {
        console.warn(
          "Could not extract viewId from view interaction payload:",
          payload,
        );
      }
    } else {
      // Handle message-based interactions (interactive_message, block_actions)
      const messageTs =
        payload.container?.message_ts ||
        payload.message?.ts ||
        payload.message_ts;

      if (messageTs) {
        const interactionData = await kv.app.get(`interaction:${messageTs}`);
        if (interactionData && interactionData.value) {
          const { blockId, originalEventId } = interactionData.value as any;
          console.log(
            `Routing interaction for message ${messageTs} to block ${blockId}`,
          );

          await messaging.sendToBlocks({
            blockIds: [blockId],
            body: { type: "slack_interaction", payload, originalEventId },
          });
        } else {
          console.warn(`No interaction data found for messageId: ${messageTs}`);
        }
      } else {
        console.warn(
          "Could not extract messageId from interaction payload:",
          payload,
        );
      }
    }

    return { statusCode: 200 };
  }

  console.warn(
    "Received unhandled payload type on /interactivity:",
    payload.type,
    payload,
  );
  return { statusCode: 200 };
}
