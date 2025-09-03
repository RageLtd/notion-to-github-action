declare namespace NodeJS {
	interface ProcessEnv {
		// GitHub Actions always provides these environment variables
		GITHUB_EVENT_PATH: string;
		GITHUB_REPOSITORY: string;
		GITHUB_TOKEN: string;
		GITHUB_WORKSPACE: string;
		GITHUB_SHA: string;
		GITHUB_REF: string;
		GITHUB_REF_NAME: string;
		GITHUB_REF_TYPE: string;
		GITHUB_ACTOR: string;
		GITHUB_WORKFLOW: string;
		GITHUB_RUN_ID: string;
		GITHUB_RUN_NUMBER: string;
		GITHUB_JOB: string;
		GITHUB_ACTION: string;
		GITHUB_ACTION_PATH: string;
		GITHUB_ACTION_REPOSITORY: string;
		GITHUB_ACTIONS: string;
		GITHUB_ACTOR_ID: string;
		GITHUB_API_URL: string;
		GITHUB_ENV: string;
		GITHUB_EVENT_NAME: string;
		GITHUB_GRAPHQL_URL: string;
		GITHUB_JOB: string;
		GITHUB_PATH: string;
		GITHUB_REPOSITORY_ID: string;
		GITHUB_REPOSITORY_OWNER: string;
		GITHUB_REPOSITORY_OWNER_ID: string;
		GITHUB_RETENTION_DAYS: string;
		GITHUB_RUN_ATTEMPT: string;
		GITHUB_SERVER_URL: string;
		GITHUB_STEP_SUMMARY: string;
		RUNNER_ARCH: string;
		RUNNER_NAME: string;
		RUNNER_OS: string;
		RUNNER_TEMP: string;
		RUNNER_TOOL_CACHE: string;

		// Custom environment variables that might be set
		NOTION_WEBHOOK_PAYLOAD?: string;
		NOTION_API_TOKEN?: string;
	}
}
