import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	extractPageId,
	getWebhookPayloadFromEnvironment,
	type NotionWebhookPayload,
	validateWebhookPayload,
} from "../src/webhook-handler";

describe("WebhookHandler", () => {
	describe("extractPageId", () => {
		it("should extract page ID from data.id", () => {
			const payload = {
				object: "event",
				data: {
					object: "page",
					id: "test-page-id-123",
				},
			} as NotionWebhookPayload;

			const result = extractPageId(payload);
			expect(result).toBe("test-page-id-123");
		});

		it("should extract page ID from page_id field", () => {
			const payload = {
				object: "page",
				page_id: "test-page-id-456",
			} as unknown as NotionWebhookPayload;

			const result = extractPageId(payload);
			expect(result).toBe("test-page-id-456");
		});

		it("should extract page ID from id field", () => {
			const payload = {
				object: "page",
				id: "test-page-id-789",
			} as unknown as NotionWebhookPayload;

			const result = extractPageId(payload);
			expect(result).toBe("test-page-id-789");
		});

		it("should return null for payload without page ID", () => {
			const payload = {
				object: "event",
				timestamp: "2023-01-01T00:00:00.000Z",
			} as unknown as NotionWebhookPayload;

			const result = extractPageId(payload);
			expect(result).toBeNull();
		});

		it("should handle invalid payload gracefully", () => {
			const result = extractPageId(null as unknown as NotionWebhookPayload);
			expect(result).toBeNull();
		});
	});

	describe("validateWebhookPayload", () => {
		it("should validate correct webhook payload", () => {
			const payload = {
				object: "event",
				event_ts: "2023-01-01T00:00:00.000Z",
				data: {
					object: "page",
					id: "test-page-id",
				},
			};

			const result = validateWebhookPayload(payload);
			expect(result).toBe(true);
		});

		it("should validate page object payload", () => {
			const payload = {
				object: "page",
				id: "test-page-id",
			} as unknown as NotionWebhookPayload;

			const result = validateWebhookPayload(payload);
			expect(result).toBe(true);
		});

		it("should reject payload without object field", () => {
			const payload = {
				data: {
					id: "test-page-id",
				},
			} as unknown as NotionWebhookPayload;

			const result = validateWebhookPayload(payload);
			expect(result).toBe(false);
		});

		it("should reject non-object payload", () => {
			const result = validateWebhookPayload(
				"invalid" as unknown as NotionWebhookPayload,
			);
			expect(result).toBe(false);
		});

		it("should reject null payload", () => {
			const result = validateWebhookPayload(
				null as unknown as NotionWebhookPayload,
			);
			expect(result).toBe(false);
		});

		it("should accept non-page objects with warning", () => {
			const payload = {
				object: "database",
				id: "test-database-id",
			} as unknown as NotionWebhookPayload;

			const result = validateWebhookPayload(payload);
			expect(result).toBe(true);
		});
	});

	describe("getWebhookPayloadFromEnvironment", () => {
		const originalEnv = process.env;

		beforeEach(() => {
			process.env = { ...originalEnv };
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		it("should throw error for invalid JSON in custom payload", () => {
			process.env.NOTION_WEBHOOK_PAYLOAD = "invalid json";
			delete process.env.GITHUB_EVENT_PATH;

			expect(() => getWebhookPayloadFromEnvironment()).toThrow();
		});
	});
});
