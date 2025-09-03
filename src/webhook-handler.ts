import * as fs from "node:fs";
import * as core from "@actions/core";

export interface NotionWebhookPayload {
	object: string;
	event_ts: string;
	data?: {
		object: string;
		id?: string;
	};
}

type WebhookPayload = NotionWebhookPayload | null | undefined;

export function extractPageId(payload: WebhookPayload) {
	if (!payload || typeof payload !== "object") {
		core.warning("No page ID found in webhook payload");
		return null;
	}

	// Handle different webhook payload structures
	if (
		"data" in payload &&
		payload.data &&
		typeof payload.data === "object" &&
		"id" in payload.data &&
		typeof payload.data.id === "string"
	) {
		core.info(`Extracted page ID from webhook: ${payload.data.id}`);
		return payload.data.id;
	}

	// Handle direct page ID in payload
	if ("page_id" in payload && typeof payload.page_id === "string") {
		core.info(`Extracted page ID from payload: ${payload.page_id}`);
		return payload.page_id;
	}

	// Handle object ID
	if ("id" in payload && typeof payload.id === "string") {
		core.info(`Extracted ID from payload: ${payload.id}`);
		return payload.id;
	}

	core.warning("No page ID found in webhook payload");
	return null;
}

export function validateWebhookPayload(payload: NotionWebhookPayload) {
	// Basic validation for Notion webhook payload
	if (!payload || typeof payload !== "object") {
		core.error("Invalid webhook payload: not an object");
		return false;
	}

	const payloadObj = payload;

	// Check for required Notion webhook fields
	if (!("object" in payloadObj) || typeof payloadObj.object !== "string") {
		core.error("Invalid webhook payload: missing object field");
		return false;
	}

	// Validate that it's a page-related webhook
	if (
		(payloadObj.data &&
			typeof payloadObj.data === "object" &&
			payloadObj.data !== null &&
			"object" in payloadObj.data &&
			payloadObj.data.object === "page") ||
		payloadObj.object === "page"
	) {
		return true;
	}

	core.warning(`Webhook payload is not page-related: ${payloadObj.object}`);
	return true; // Still valid, might be other types of updates
}

export function getWebhookPayloadFromEnvironment() {
	// GitHub Actions provides webhook payload in GITHUB_EVENT_PATH
	const eventPath = process.env.GITHUB_EVENT_PATH;

	const eventPayload: NotionWebhookPayload | null = JSON.parse(
		fs.readFileSync(eventPath, "utf8"),
	);
	core.info("Loaded webhook payload from GitHub event");
	return eventPayload;
}
