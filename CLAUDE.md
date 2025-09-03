# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a GitHub Action for integrating with Notion. The action is designed to sync data between Notion databases/pages and GitHub repositories.

## Development Commands

Since this is a new repository, common development commands will be established as the project grows. Typical GitHub Action development patterns include:

- `npm install` - Install dependencies
- `npm run build` - Build the action 
- `npm run test` - Run tests
- `npm run lint` - Run linting
- `npm run package` - Package the action for distribution

## Architecture

### GitHub Action Structure
- **Action entry point**: Typically `action.yml` defining inputs, outputs, and runs configuration
- **Main code**: Usually in `src/` or `lib/` directory with TypeScript/JavaScript
- **Distribution**: `dist/` directory containing compiled/bundled code for GitHub Actions runtime
- **Tests**: Test files in `__tests__/` or `test/` directory

### Notion Integration Patterns
- **Authentication**: Notion API integration requires API token handling
- **Database operations**: Read/write operations on Notion databases
- **Page operations**: Create, update, and query Notion pages
- **Error handling**: Robust error handling for API rate limits and failures

## Key Implementation Considerations

### Security
- Store Notion API tokens as GitHub repository secrets
- Never commit API keys or sensitive data to the repository
- Use GitHub Actions input parameters for configuration

### GitHub Actions Best Practices
- Use semantic versioning for action releases
- Provide clear input/output documentation in `action.yml`
- Include comprehensive error messages and logging
- Support both JavaScript and Docker container action types

### Notion API Integration
- Handle API rate limiting (3 requests per second for Notion API)
- Implement proper error handling for network requests
- Use official Notion SDK when available
- Cache results when appropriate to reduce API calls

## Testing Strategy

- Unit tests for core logic
- Integration tests with Notion API (using test databases)
- GitHub Actions workflow testing in `.github/workflows/`
- Mock Notion API responses for reliable CI/CD

This guide will be updated as the project develops and architectural patterns emerge.