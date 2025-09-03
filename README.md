# Notion to GitHub Wiki Sync Action

A GitHub Action that automatically syncs Notion documents and their child pages to your repository's GitHub wiki. Perfect for maintaining documentation that lives in Notion while making it accessible via GitHub.

## Features

- 🔄 **Automatic Sync**: Triggered by Notion webhooks or manual execution
- 📄 **Recursive Sync**: Syncs parent pages and all child pages
- 🎨 **Markdown Conversion**: Converts Notion blocks to GitHub-flavored markdown
- 🏗️ **Smart Naming**: Sanitizes page titles for wiki-compatible filenames
- ⚙️ **Configurable**: Set path prefixes and sync depth limits
- 🛡️ **Robust**: Comprehensive error handling and logging
- 🧪 **Tested**: Full test coverage with 47+ tests

## Supported Notion Block Types

- Paragraphs with rich text formatting (bold, italic, code, strikethrough)
- Headings (H1, H2, H3)
- Bulleted and numbered lists
- Code blocks with syntax highlighting
- Quotes
- Dividers
- Links and mentions

## Quick Start

### 1. Setup Notion Integration

1. Create a new integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Copy the "Internal Integration Token"
3. Share your Notion pages with the integration

### 2. Configure GitHub Repository

Add the following secrets to your repository:
- `NOTION_API_TOKEN`: Your Notion integration token

### 3. Create Workflow

Create `.github/workflows/notion-sync.yml`:

```yaml
name: Sync Notion to Wiki

on:
  repository_dispatch:
    types: [notion-update]
  workflow_dispatch:
    inputs:
      notion-page-id:
        description: 'Notion Page ID to sync'
        required: true
        type: string

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Notion to Wiki
        uses: nathandevuono/notion-to-github-action@v1
        with:
          notion-api-token: ${{ secrets.NOTION_API_TOKEN }}
          notion-page-id: ${{ github.event.inputs.notion-page-id || github.event.client_payload.page_id }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          wiki-path-prefix: 'notion'
          max-depth: 5
```

## Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `notion-api-token` | Notion API integration token | ✅ | - |
| `notion-page-id` | Root Notion page ID to sync | No* | Extracted from webhook |
| `github-token` | GitHub token with wiki permissions | ✅ | `${{ github.token }}` |
| `wiki-path-prefix` | Optional prefix for wiki page names | No | `''` |
| `max-depth` | Maximum depth for recursive syncing | No | `10` |

*Required if not triggered by webhook with page ID

## Action Outputs

| Output | Description |
|--------|-------------|
| `pages-synced` | Number of pages successfully synced |
| `sync-status` | Status: `success`, `error`, or `partial` |

## Usage Examples

### Manual Trigger

Trigger the action manually with a specific page ID:

```yaml
- name: Sync Specific Page
  uses: nathandevuono/notion-to-github-action@v1
  with:
    notion-api-token: ${{ secrets.NOTION_API_TOKEN }}
    notion-page-id: '12345678-1234-1234-1234-123456789012'
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Webhook Integration

Set up Notion webhooks to trigger automatic syncing:

```yaml
on:
  repository_dispatch:
    types: [notion-update]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync from Webhook
        uses: nathandevuono/notion-to-github-action@v1
        with:
          notion-api-token: ${{ secrets.NOTION_API_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          # Page ID extracted from webhook payload
```

### With Custom Configuration

```yaml
- name: Sync with Custom Settings
  uses: nathandevuono/notion-to-github-action@v1
  with:
    notion-api-token: ${{ secrets.NOTION_API_TOKEN }}
    notion-page-id: ${{ inputs.page-id }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    wiki-path-prefix: 'docs'
    max-depth: 3
```

## Webhook Setup

To enable automatic syncing when Notion pages are updated:

1. **Create webhook endpoint**: Use GitHub's `repository_dispatch` API
2. **Configure Notion webhook**: Point to your webhook endpoint
3. **Handle webhook payload**: Action automatically extracts page ID from payload

Example webhook payload handling:
```json
{
  "event_type": "notion-update",
  "client_payload": {
    "page_id": "12345678-1234-1234-1234-123456789012"
  }
}
```

## Page Naming

The action automatically sanitizes Notion page titles for wiki compatibility:

- `"API Documentation v2.0"` → `"api-documentation-v20"`
- `"User Guide (Advanced)"` → `"user-guide-advanced"`
- With prefix `"docs"`: `"docs-user-guide-advanced"`

## Error Handling

The action includes comprehensive error handling:

- **API Rate Limits**: Respects Notion API limits
- **Missing Pages**: Graceful handling of deleted/inaccessible pages
- **Network Issues**: Retry logic for transient failures
- **Validation**: Input validation and clear error messages

## Development

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Node.js 20+

### Setup

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build action
bun run build

# Lint code
bun run lint

# Format code
bun run format
```

### Project Structure

```
├── src/
│   ├── index.ts           # Main entry point
│   ├── notion-sync.ts     # Core sync logic
│   └── webhook-handler.ts # Webhook processing
├── __tests__/             # Test files
├── dist/                  # Compiled output
├── action.yml             # Action metadata
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── biome.json            # Biome config
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `bun test` to ensure all tests pass
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/nathandevuono/notion-to-github-action/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nathandevuono/notion-to-github-action/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/nathandevuono/notion-to-github-action/wiki)

---

Made with ❤️ by [Nathan DeVuono](https://github.com/nathandevuono)