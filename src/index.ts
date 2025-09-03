import * as core from "@actions/core";
import { NotionSync } from "./notion-sync";
import {
	extractPageId,
	getWebhookPayloadFromEnvironment,
	validateWebhookPayload,
} from "./webhook-handler";

async function run(): Promise<void> {
	// Get configuration inputs
	const notionApiToken = core.getInput("notion-api-token", {
		required: true,
	});
	const githubToken = core.getInput("github-token", { required: true });
	const wikiPathPrefix = core.getInput("wiki-path-prefix") || "";
	const maxDepthInput = core.getInput("max-depth") || "10";

	// Validate max depth
	const maxDepth = parseInt(maxDepthInput, 10);
	if (Number.isNaN(maxDepth) || maxDepth < 1) {
		throw new Error(
			`Invalid max-depth value: ${maxDepthInput}. Must be a positive integer.`,
		);
	}

	core.info("Starting Notion to GitHub Wiki sync...");
	core.info(
		`Configuration: wiki-path-prefix="${wikiPathPrefix}", max-depth=${maxDepth}`,
	);

	// Try to get page ID from input first
	let notionPageId = core.getInput("notion-page-id");

	// If no page ID provided, try to extract from webhook
	if (!notionPageId) {
		core.info("No page ID provided in input, checking webhook payload...");

		const webhookPayload = getWebhookPayloadFromEnvironment();

		if (webhookPayload) {
			if (!validateWebhookPayload(webhookPayload)) {
				throw new Error("Invalid webhook payload received");
			}

			const extractedPageId = extractPageId(webhookPayload);
			if (extractedPageId) {
				notionPageId = extractedPageId;
			}
		}
	}

	// Validate that we have a page ID
	if (!notionPageId) {
		throw new Error(
			'No Notion page ID found. Provide either "notion-page-id" input or trigger via webhook with page ID.',
		);
	}

	core.info(`Target page ID: ${notionPageId}`);

	// Initialize sync service
	const notionSync = new NotionSync({
		notionApiToken,
		githubToken,
		wikiPathPrefix,
		maxDepth,
	});

	// Perform sync
	core.info("Executing sync operation...");
	const result = await notionSync.syncFromWebhook(notionPageId);

	// Set outputs
	core.setOutput("pages-synced", result.pagesSynced.toString());
	core.setOutput("sync-status", result.status);

	// Log results
	if (result.status === "success") {
		core.info(
			`✅ Sync completed successfully! Pages synced: ${result.pagesSynced}`,
		);
	} else if (result.status === "partial") {
		core.warning(
			`⚠️  Sync completed with issues. Pages synced: ${result.pagesSynced}`,
		);
	} else {
		core.error(`❌ Sync failed. Pages synced: ${result.pagesSynced}`);
	}
}

// Execute the action with error handling
run()
	.then(() => {
		core.info("Action completed successfully");
	})
	.catch((error) => {
		const errorMessage = error instanceof Error ? error.message : String(error);

		core.error(`Action failed: ${errorMessage}`);
		core.setOutput("pages-synced", "0");
		core.setOutput("sync-status", "error");
		core.setFailed(errorMessage);
	});
