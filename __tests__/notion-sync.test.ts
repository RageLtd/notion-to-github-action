import { beforeEach, describe, expect, it, mock } from "bun:test";
import type {
	BlockObjectResponse,
	PageObjectResponse,
	RichTextItemResponse,
} from "@notionhq/client";
import { NotionSync } from "../src/notion-sync";

// Mock @actions/core
const mockCore = {
	info: mock(),
	error: mock(),
	warning: mock(),
};

// Mock the core module
mock.module("@actions/core", () => mockCore);

describe("NotionSync", () => {
	let notionSync: NotionSync;

	beforeEach(() => {
		// Reset mocks
		mockCore.info.mockReset();
		mockCore.error.mockReset();
		mockCore.warning.mockReset();

		// Create NotionSync instance
		notionSync = new NotionSync({
			notionApiToken: "test-notion-token",
			githubToken: "test-github-token",
			wikiPathPrefix: "notion",
			maxDepth: 5,
		});

		// Set up environment for tests
		process.env.GITHUB_REPOSITORY = "test-owner/test-repo";
	});

	describe("constructor", () => {
		it("should initialize with correct configuration", () => {
			expect(notionSync).toBeDefined();
		});

		it("should handle missing optional configuration", () => {
			const minimalSync = new NotionSync({
				notionApiToken: "test-token",
				githubToken: "test-github-token",
			});
			expect(minimalSync).toBeDefined();
		});
	});

	describe("syncFromWebhook", () => {
		it("should return error result when no page ID provided", async () => {
			const result = await notionSync.syncFromWebhook();

			expect(result.status).toBe("error");
			expect(result.pagesSynced).toBe(0);
		});

		it("should return error result when empty page ID provided", async () => {
			const result = await notionSync.syncFromWebhook("");

			expect(result.status).toBe("error");
			expect(result.pagesSynced).toBe(0);
		});
	});

	describe("extractPageTitle", () => {
		it("should extract title from page properties", () => {
			const page = {
				properties: {
					title: {
						type: "title",
						title: [{ plain_text: "My Test Page" }],
					},
				},
			} as unknown as PageObjectResponse;

			const title = notionSync["extractPageTitle"](page);
			expect(title).toBe("My Test Page");
		});

		it("should return 'Untitled' for pages without title", () => {
			const page = {
				properties: {},
			} as unknown as PageObjectResponse;

			const title = notionSync["extractPageTitle"](page);
			expect(title).toBe("Untitled");
		});

		it("should return 'Untitled' for pages without properties", () => {
			const page = {} as unknown as PageObjectResponse;

			const title = notionSync["extractPageTitle"](page);
			expect(title).toBe("Untitled");
		});

		it("should handle empty title array", () => {
			const page = {
				properties: {
					title: {
						type: "title",
						title: [],
					},
				},
			} as unknown as PageObjectResponse;

			const title = notionSync["extractPageTitle"](page);
			expect(title).toBe("Untitled");
		});
	});

	describe("generateWikiPageName", () => {
		it("should sanitize title and add prefix", () => {
			const title = "My Test Page!@#$";

			const pageName = notionSync["generateWikiPageName"](title);
			expect(pageName).toBe("notion-my-test-page");
		});

		it("should handle titles with spaces", () => {
			const title = "Multiple   Spaces   Here";

			const pageName = notionSync["generateWikiPageName"](title);
			expect(pageName).toBe("notion-multiple-spaces-here");
		});

		it("should work without prefix", () => {
			const syncWithoutPrefix = new NotionSync({
				notionApiToken: "test-token",
				githubToken: "test-github-token",
			});

			const pageName = syncWithoutPrefix["generateWikiPageName"]("Test Page");
			expect(pageName).toBe("test-page");
		});

		it("should handle special characters and numbers", () => {
			const title = "API v2.0 - User Guide (2024)";

			const pageName = notionSync["generateWikiPageName"](title);
			expect(pageName).toBe("notion-api-v20-user-guide-2024");
		});
	});

	describe("convertRichTextToMarkdown", () => {
		it("should convert plain text", () => {
			const richText = [
				{ plain_text: "Hello world" },
			] as RichTextItemResponse[];

			const markdown = notionSync["convertRichTextToMarkdown"](richText);
			expect(markdown).toBe("Hello world");
		});

		it("should convert bold text", () => {
			const richText = [
				{
					plain_text: "Bold text",
					annotations: { bold: true },
				},
			] as RichTextItemResponse[];

			const markdown = notionSync["convertRichTextToMarkdown"](richText);
			expect(markdown).toBe("**Bold text**");
		});

		it("should convert italic text", () => {
			const richText = [
				{
					plain_text: "Italic text",
					annotations: { italic: true },
				},
			] as RichTextItemResponse[];

			const markdown = notionSync["convertRichTextToMarkdown"](richText);
			expect(markdown).toBe("*Italic text*");
		});

		it("should convert code text", () => {
			const richText = [
				{
					plain_text: "code",
					annotations: { code: true },
				},
			] as RichTextItemResponse[];

			const markdown = notionSync["convertRichTextToMarkdown"](richText);
			expect(markdown).toBe("`code`");
		});

		it("should convert strikethrough text", () => {
			const richText = [
				{
					plain_text: "strikethrough",
					annotations: { strikethrough: true },
				},
			] as RichTextItemResponse[];

			const markdown = notionSync["convertRichTextToMarkdown"](richText);
			expect(markdown).toBe("~~strikethrough~~");
		});

		it("should convert links", () => {
			const richText = [
				{
					plain_text: "GitHub",
					href: "https://github.com",
				},
			] as RichTextItemResponse[];

			const markdown = notionSync["convertRichTextToMarkdown"](richText);
			expect(markdown).toBe("[GitHub](https://github.com)");
		});

		it("should handle multiple annotations", () => {
			const richText = [
				{
					plain_text: "Bold italic code",
					annotations: {
						bold: true,
						italic: true,
						code: true,
					},
				},
			] as RichTextItemResponse[];

			const markdown = notionSync["convertRichTextToMarkdown"](richText);
			expect(markdown).toBe("`***Bold italic code***`");
		});

		it("should handle empty rich text array", () => {
			const markdown = notionSync["convertRichTextToMarkdown"]([]);
			expect(markdown).toBe("");
		});

		it("should handle multiple text elements", () => {
			const richText = [
				{ plain_text: "Hello " },
				{ plain_text: "world", annotations: { bold: true } },
				{ plain_text: "!" },
			] as RichTextItemResponse[];

			const markdown = notionSync["convertRichTextToMarkdown"](richText);
			expect(markdown).toBe("Hello **world**!");
		});
	});

	describe("extractChildPageIds", () => {
		it("should extract child page IDs from blocks", () => {
			const blocks = [
				{
					type: "child_page",
					id: "child-page-1",
				},
				{
					type: "paragraph",
					paragraph: {
						rich_text: [
							{
								type: "mention",
								mention: {
									type: "page",
									page: { id: "mentioned-page-1" },
								},
							},
						],
					},
				},
			] as BlockObjectResponse[];

			const childIds = notionSync["extractChildPageIds"](blocks);
			expect(childIds).toEqual(["child-page-1", "mentioned-page-1"]);
		});

		it("should return empty array for blocks without child pages", () => {
			const blocks = [
				{
					type: "paragraph",
					paragraph: {
						rich_text: [{ plain_text: "Regular text" }],
					},
				},
			] as BlockObjectResponse[];

			const childIds = notionSync["extractChildPageIds"](blocks);
			expect(childIds).toEqual([]);
		});

		it("should handle blocks without rich_text", () => {
			const blocks = [
				{
					type: "paragraph",
					paragraph: {},
				},
			] as BlockObjectResponse[];

			const childIds = notionSync["extractChildPageIds"](blocks);
			expect(childIds).toEqual([]);
		});

		it("should handle multiple child pages", () => {
			const blocks = [
				{
					type: "child_page",
					id: "child-page-1",
				},
				{
					type: "child_page",
					id: "child-page-2",
				},
			] as BlockObjectResponse[];

			const childIds = notionSync["extractChildPageIds"](blocks);
			expect(childIds).toEqual(["child-page-1", "child-page-2"]);
		});

		it("should handle non-page mentions", () => {
			const blocks = [
				{
					type: "paragraph",
					paragraph: {
						rich_text: [
							{
								type: "mention",
								mention: {
									type: "user",
									user: { id: "user-id-1" },
								},
							},
						],
					},
				},
			] as BlockObjectResponse[];

			const childIds = notionSync["extractChildPageIds"](blocks);
			expect(childIds).toEqual([]);
		});
	});

	describe("convertBlockToMarkdown", () => {
		it("should convert paragraph blocks", async () => {
			const block = {
				type: "paragraph",
				paragraph: {
					rich_text: [{ plain_text: "This is a paragraph" }],
				},
			} as BlockObjectResponse;

			const markdown = await notionSync["convertBlockToMarkdown"](block);
			expect(markdown).toBe("This is a paragraph");
		});

		it("should convert heading blocks", async () => {
			const h1Block = {
				type: "heading_1",
				heading_1: {
					rich_text: [{ plain_text: "Heading 1" }],
				},
			} as BlockObjectResponse;

			const h2Block = {
				type: "heading_2",
				heading_2: {
					rich_text: [{ plain_text: "Heading 2" }],
				},
			} as BlockObjectResponse;

			const h3Block = {
				type: "heading_3",
				heading_3: {
					rich_text: [{ plain_text: "Heading 3" }],
				},
			} as BlockObjectResponse;

			const h1Markdown = await notionSync["convertBlockToMarkdown"](h1Block);
			const h2Markdown = await notionSync["convertBlockToMarkdown"](h2Block);
			const h3Markdown = await notionSync["convertBlockToMarkdown"](h3Block);

			expect(h1Markdown).toBe("# Heading 1");
			expect(h2Markdown).toBe("## Heading 2");
			expect(h3Markdown).toBe("### Heading 3");
		});

		it("should convert list blocks", async () => {
			const bulletBlock = {
				type: "bulleted_list_item",
				bulleted_list_item: {
					rich_text: [{ plain_text: "Bullet item" }],
				},
			} as BlockObjectResponse;

			const numberedBlock = {
				type: "numbered_list_item",
				numbered_list_item: {
					rich_text: [{ plain_text: "Numbered item" }],
				},
			} as BlockObjectResponse;

			const bulletMarkdown =
				await notionSync["convertBlockToMarkdown"](bulletBlock);
			const numberedMarkdown =
				await notionSync["convertBlockToMarkdown"](numberedBlock);

			expect(bulletMarkdown).toBe("- Bullet item");
			expect(numberedMarkdown).toBe("1. Numbered item");
		});

		it("should convert code blocks", async () => {
			const block = {
				type: "code",
				code: {
					rich_text: [{ plain_text: "const x = 1;" }],
					language: "javascript",
				},
			} as BlockObjectResponse;

			const markdown = await notionSync["convertBlockToMarkdown"](block);
			expect(markdown).toBe("```javascript\nconst x = 1;\n```");
		});

		it("should convert quote blocks", async () => {
			const block = {
				type: "quote",
				quote: {
					rich_text: [{ plain_text: "This is a quote" }],
				},
			} as BlockObjectResponse;

			const markdown = await notionSync["convertBlockToMarkdown"](block);
			expect(markdown).toBe("> This is a quote");
		});

		it("should convert divider blocks", async () => {
			const block = {
				type: "divider",
			} as BlockObjectResponse;

			const markdown = await notionSync["convertBlockToMarkdown"](block);
			expect(markdown).toBe("---");
		});

		it("should handle unsupported block types", async () => {
			const block = {
				type: "unsupported_block_type",
			} as unknown as BlockObjectResponse;

			const markdown = await notionSync["convertBlockToMarkdown"](block);
			expect(markdown).toBe("");
		});
	});
});
