import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import {
	type BlockObjectResponse,
	Client,
	type PageObjectResponse,
	type PartialBlockObjectResponse,
	type RichTextItemResponse,
} from "@notionhq/client";

export interface NotionSyncConfig {
	notionApiToken: string;
	githubToken: string;
	wikiPathPrefix?: string;
	maxDepth?: number;
}

export interface SyncResult {
	pagesSynced: number;
	status: "success" | "error" | "partial";
}

export class NotionSync {
	private notion: Client;
	private octokit: ReturnType<typeof getOctokit>;
	private config: NotionSyncConfig;

	constructor(config: NotionSyncConfig) {
		this.config = config;
		this.notion = new Client({
			auth: config.notionApiToken,
		});
		this.octokit = getOctokit(config.githubToken);
	}

	async syncFromWebhook(pageId?: string): Promise<SyncResult> {
		try {
			core.info("Starting sync from webhook...");

			if (!pageId) {
				throw new Error("No page ID provided for sync");
			}

			core.info(`Syncing page: ${pageId}`);

			const syncedPages = await this.syncPageRecursively(pageId, 0);

			return {
				pagesSynced: syncedPages,
				status: "success",
			};
		} catch (error) {
			core.error(`Sync failed: ${error}`);
			return {
				pagesSynced: 0,
				status: "error",
			};
		}
	}

	private async syncPageRecursively(
		pageId: string,
		currentDepth: number,
	): Promise<number> {
		const maxDepth = this.config.maxDepth || 10;

		if (currentDepth >= maxDepth) {
			core.warning(`Reached maximum depth ${maxDepth}, stopping recursion`);
			return 0;
		}

		let syncedCount = 0;

		try {
			// Get the page content
			const page = await this.notion.pages.retrieve({ page_id: pageId });

			if (!("properties" in page)) {
				core.warning(`Page ${pageId} is not a standard page, skipping`);
				return 0;
			}

			// Get page blocks (content)
			const blocks = await this.notion.blocks.children.list({
				block_id: pageId,
				page_size: 100,
			});

			// Convert page to markdown and sync to wiki
			await this.syncPageToWiki(page, blocks.results);
			syncedCount++;

			core.info(`Synced page: ${pageId} (depth: ${currentDepth})`);

			// Find child pages and sync them recursively
			const childPageIds = this.extractChildPageIds(blocks.results);

			for (const childPageId of childPageIds) {
				const childSynced = await this.syncPageRecursively(
					childPageId,
					currentDepth + 1,
				);
				syncedCount += childSynced;
			}
		} catch (error) {
			core.error(`Failed to sync page ${pageId}: ${error}`);
		}

		return syncedCount;
	}

	private extractChildPageIds(
		blocks: (BlockObjectResponse | PartialBlockObjectResponse)[],
	): string[] {
		const pageIds: string[] = [];

		for (const block of blocks) {
			// Type guard to check if it's a BlockObjectResponse
			if ("type" in block) {
				// Look for child page blocks
				if (block.type === "child_page") {
					pageIds.push(block.id);
				}

				// Look for page mentions or links
				if (
					block.type === "paragraph" &&
					"paragraph" in block &&
					block.paragraph?.rich_text
				) {
					for (const richText of block.paragraph.rich_text) {
						if (
							richText.type === "mention" &&
							richText.mention?.type === "page"
						) {
							pageIds.push(richText.mention.page.id);
						}
					}
				}
			}
		}

		return pageIds;
	}

	private async syncPageToWiki(
		page: PageObjectResponse,
		blocks: (PartialBlockObjectResponse | BlockObjectResponse)[],
	): Promise<void> {
		try {
			// Extract page title
			const title = this.extractPageTitle(page);
			const wikiPageName = this.generateWikiPageName(title);

			// Convert blocks to markdown
			const markdownContent = await this.convertBlocksToMarkdown(blocks, title);

			// Sync to GitHub wiki
			await this.updateWikiPage(wikiPageName, markdownContent);
		} catch (error) {
			core.error(`Failed to sync page to wiki: ${error}`);
			throw error;
		}
	}

	private extractPageTitle(page: PageObjectResponse): string {
		if (!page.properties) {
			return "Untitled";
		}

		// Look for title property
		for (const [_key, property] of Object.entries(page.properties)) {
			if (property.type === "title" && property.title?.length > 0) {
				return property.title[0].plain_text || "Untitled";
			}
		}

		return "Untitled";
	}

	private generateWikiPageName(title: string): string {
		const prefix = this.config.wikiPathPrefix || "";
		const sanitizedTitle = title
			.replace(/[^a-zA-Z0-9\s-]/g, "") // Remove special characters
			.replace(/\s+/g, "-") // Replace spaces with hyphens
			.replace(/-+/g, "-") // Collapse multiple dashes to single dash
			.toLowerCase();

		return prefix ? `${prefix}-${sanitizedTitle}` : sanitizedTitle;
	}

	private async convertBlocksToMarkdown(
		blocks: (PartialBlockObjectResponse | BlockObjectResponse)[],
		pageTitle: string,
	): Promise<string> {
		let markdown = `# ${pageTitle}\n\n`;

		for (const block of blocks) {
			const blockMarkdown = await this.convertBlockToMarkdown(block);
			if (blockMarkdown) {
				markdown += `${blockMarkdown}\n\n`;
			}
		}

		return markdown.trim();
	}

	private async convertBlockToMarkdown(
		block: PartialBlockObjectResponse | BlockObjectResponse,
	): Promise<string> {
		// Type guard to ensure we have a complete block object
		if (!("type" in block)) {
			core.warning("Encountered partial block object, skipping");
			return "";
		}

		switch (block.type) {
			case "paragraph":
				return this.convertRichTextToMarkdown(block.paragraph?.rich_text || []);

			case "heading_1": {
				const h1Text = this.convertRichTextToMarkdown(
					block.heading_1?.rich_text || [],
				);
				return `# ${h1Text}`;
			}

			case "heading_2": {
				const h2Text = this.convertRichTextToMarkdown(
					block.heading_2?.rich_text || [],
				);
				return `## ${h2Text}`;
			}

			case "heading_3": {
				const h3Text = this.convertRichTextToMarkdown(
					block.heading_3?.rich_text || [],
				);
				return `### ${h3Text}`;
			}

			case "bulleted_list_item": {
				const bulletText = this.convertRichTextToMarkdown(
					block.bulleted_list_item?.rich_text || [],
				);
				return `- ${bulletText}`;
			}

			case "numbered_list_item": {
				const numberText = this.convertRichTextToMarkdown(
					block.numbered_list_item?.rich_text || [],
				);
				return `1. ${numberText}`;
			}

			case "code": {
				const codeText = this.convertRichTextToMarkdown(
					block.code?.rich_text || [],
				);
				const language = block.code?.language || "";
				return `\`\`\`${language}\n${codeText}\n\`\`\``;
			}

			case "quote": {
				const quoteText = this.convertRichTextToMarkdown(
					block.quote?.rich_text || [],
				);
				return `> ${quoteText}`;
			}

			case "divider":
				return "---";

			default:
				core.warning(`Unsupported block type: ${block.type}`);
				return "";
		}
	}

	private convertRichTextToMarkdown(
		richTextArray: RichTextItemResponse[],
	): string {
		return richTextArray
			.map((richText) => {
				let text = richText.plain_text || "";

				if (richText.annotations) {
					if (richText.annotations.bold) {
						text = `**${text}**`;
					}
					if (richText.annotations.italic) {
						text = `*${text}*`;
					}
					if (richText.annotations.code) {
						text = `\`${text}\``;
					}
					if (richText.annotations.strikethrough) {
						text = `~~${text}~~`;
					}
				}

				if (richText.href) {
					text = `[${text}](${richText.href})`;
				}

				return text;
			})
			.join("");
	}

	private async updateWikiPage(
		pageName: string,
		content: string,
	): Promise<void> {
		try {
			const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");

			if (!owner || !repo) {
				throw new Error("Unable to determine repository owner and name");
			}

			// Try to get existing wiki page
			let sha: string | undefined;
			try {
				const existingPage = await this.octokit.rest.repos.getContent({
					owner,
					repo: `${repo}.wiki`,
					path: `${pageName}.md`,
				});

				if (existingPage?.data && "sha" in existingPage.data) {
					sha = existingPage?.data.sha;
				}
			} catch (_error) {
				// Page doesn't exist, will create new one
				core.info(`Creating new wiki page: ${pageName}`);
			}

			// Create or update the wiki page
			await this.octokit.rest.repos.createOrUpdateFileContents({
				owner,
				repo: `${repo}.wiki`,
				path: `${pageName}.md`,
				message: `Update ${pageName} from Notion sync`,
				content: Buffer.from(content).toString("base64"),
				sha,
			});

			core.info(`Successfully updated wiki page: ${pageName}`);
		} catch (error) {
			core.error(`Failed to update wiki page ${pageName}: ${error}`);
			throw error;
		}
	}
}
