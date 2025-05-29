# Claude Code Configuration for Prfect

This file provides Claude Code with context about the Prfect project to enhance development assistance.

## Project Overview

Prfect is a CLI tool that generates professional pull request descriptions using local AI models via Ollama. It analyzes git commits, file changes, and code diffs to create structured PR descriptions automatically.

## Architecture (Refactored - Modular Design)

The codebase has been refactored into a modular architecture with utility classes for better testability and maintainability:

### Core Classes

**PRGenerator Class (`index.ts`)**

- Main orchestration class that coordinates all utilities
- Handles CLI interaction, logging, and user prompts
- Delegates specific tasks to utility classes
- Methods: `run()`, `checkOllamaSetup()`, `generatePRMessage()`, `saveToFile()`

**GitAnalyzer (`src/utils/GitAnalyzer.ts`)**

- Handles all git repository operations
- Methods: `isGitRepo()`, `getCurrentBranch()`, `detectDefaultBranch()`, `getCommitsInfo()`
- Manages git command execution with proper error handling
- Supports branch detection and commit analysis
- Utility methods: `getFileChanges()`, `getCodeSample()`, `getMergeBase()`

**OllamaClient (`src/utils/OllamaClient.ts`)**

- Manages all Ollama API communication
- Methods: `getAvailableModels()`, `generate()`, `testConnection()`, `generatePRMessage()`
- Handles timeouts, retries, and response validation
- Includes specialized PR message generation with templates
- Host validation and model availability checking

**OutputProcessor (`src/utils/OutputProcessor.ts`)**

- Processes AI responses and handles output formatting
- Key method: `processResponse()` - strips `<think>.*?</think>` tags using regex with `gis` flags
- Utility methods: `generateFilename()`, `limitLines()`, `formatContent()`
- Thinking tag detection and extraction capabilities
- File validation and content formatting

**TemplateLoader (`src/utils/TemplateLoader.ts`)**

- Handles custom PR template loading and processing
- Methods: `loadTemplate()`, `generatePromptWithTemplate()`, `validateTemplate()`
- Smart detection priority system with multiple fallback paths
- GitHub standard template auto-detection
- Template validation and prompt generation integration
- Mono-repo support with directory tree traversal

### Utility Exports (`src/utils/index.ts`)

- Central export file for easy importing of all utilities
- Provides TypeScript interfaces and type definitions
- Enables clean imports: `import { GitAnalyzer, OutputProcessor, OllamaClient, TemplateLoader } from './src/utils'`
- Exports TemplateConfig interface for template configuration

## Output Processing Pipeline

1. **Raw Response**: Ollama returns JSON with `response` field
2. **Thinking Strip**: OutputProcessor removes `<think>.*?</think>` tags using regex with `gis` flags
3. **Emoji Control**: Conditionally includes emojis based on `noEmojis` flag
4. **File Output**: Optional markdown file generation with timestamps via OutputProcessor

## CLI Configuration Pattern

Adding new options requires updates in 3 places:

1. `program.option()` or `program.argument()` - CLI flag/argument definition
2. `run()` method signature - TypeScript interface
3. `generator.run()` call - Passing options through

## Context Support

Prfect supports adding custom context to the AI prompt for enhanced PR descriptions:

### Usage Examples

```bash
# Add context about ticket numbers and background
prfect "This was a big refactor that addressed Linear ticket BE-123. Follow up for BE-124 coming soon but non blocking" --no-emoji

# Context with other options
prfect "Fixes critical bug from user reports" --source feature/bugfix --target main --model qwen3:latest

# Context in CI mode
prfect "Implements OAuth integration per security requirements" --ci --source feature/oauth --target main
```

### Context Features

- **Additional Information**: Provide ticket numbers, background context, or motivation
- **Template Integration**: Context is automatically included in both custom templates and default prompts
- **AI Enhancement**: Helps the LLM understand business context not visible in code changes
- **Flexible Usage**: Works with all existing CLI options and modes

## CI Mode

The `--ci` flag enables CI mode for automated workflows like GitHub Actions:

### Features

- **Silent Operation**: Suppresses all log messages and interactive prompts
- **JSON Output**: Outputs structured JSON with `title`, `body`, `source_branch`, and `target_branch`
- **GitHub Actions Compatible**: Designed for easy parsing in bash scripts and workflows
- **Error Handling**: Still throws errors for invalid git repos or Ollama connectivity issues

### Usage

```bash
prfect --ci --source feature/branch --target main --model qwen3:latest
```

### Output Format

```json
{
  "title": "Add user authentication system",
  "body": "Implements JWT authentication with proper validation and error handling.",
  "source_branch": "feature/auth",
  "target_branch": "main"
}
```

### GitHub Actions Integration

```yaml
- name: Generate PR Description
  run: |
    PR_DATA=$(prfect --ci --source ${{ github.head_ref }} --target main)
    TITLE=$(echo "$PR_DATA" | jq -r '.title')
    BODY=$(echo "$PR_DATA" | jq -r '.body')
    gh pr create --title "$TITLE" --body "$BODY"
```

## Custom PR Templates

Prfect supports custom PR templates to match your team's workflow and requirements.

### Template Detection Priority

1. **Explicit path**: `--template-path custom/template.md`
2. **GitHub standard**: `.github/pull_request_template.md`
3. **Alternative naming**: `.github/PULL_REQUEST_TEMPLATE.md`
4. **Docs location**: `docs/pull_request_template.md`
5. **Default built-in**: Fallback template

### Usage

```bash
# Use custom template
prfect --template-path .github/custom_template.md

# Auto-detect GitHub template (default behavior)
prfect

# Specify source and target with template
prfect --source feature/auth --target main --template-path team_template.md
```

### Template Features

- **Mono-repo Support**: Searches up directory tree for templates
- **Validation**: Checks template structure and content
- **GitHub Integration**: Works seamlessly with GitHub Actions
- **Fallback Handling**: Uses default if template not found

### Template Structure

Templates should include common sections like:
- `## Summary` or `## Overview`
- `## Type of Change` (with checkboxes)
- `## Key Changes`
- `## How has this been tested?`
- `## Breaking Changes` (optional)

Example template structure:
```markdown
## Summary
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Key Changes
- 
- 

## How has this been tested?
- [ ] Unit tests pass
- [ ] Manual testing completed
```

## Error Handling Patterns

- **Git Errors**: GitAnalyzer wraps commands in try/catch with descriptive messages
- **Network Errors**: OllamaClient detects timeouts via `error.name === "TimeoutError"`
- **Model Errors**: OllamaClient validates model existence before generation
- **Repository Validation**: GitAnalyzer checks for git repo and branch existence

## Debugging Features

- `--show-thinking`: OutputProcessor preserves AI reasoning in output
- Colored logging with chalk: info (green), warn (yellow), error (red)
- OllamaClient provides detailed connection diagnostics

## Testing Architecture

### Test Runner

- **Bun Test**: Uses Bun's built-in test runner for fast, native TypeScript testing
- **No Additional Dependencies**: Leverages Bun's testing utilities without external frameworks
- **Test Commands**: Run tests with `bun test` or `bun test --watch` for development

### Test Files Structure

- `test/index.test.ts`: Tests OutputProcessor and GitAnalyzer utilities directly
- `test/ollama.test.ts`: Tests OllamaClient with mocked fetch responses
- `test/cli.test.ts`: Tests CLI option parsing and validation
- `test/template.test.ts`: Tests TemplateLoader functionality and template processing

### Testing Requirements

- **Feature Parity**: Every new feature MUST have matching unit tests
- **Method Coverage**: Each public method in utility classes requires test coverage
- **Edge Cases**: Tests must cover error conditions, empty inputs, and boundary cases
- **Mocking Strategy**: Use Bun's mocking capabilities for external dependencies (git, fetch)

### Testing Benefits

- **Unit Testing**: Each utility class can be imported and tested independently
- **Mocking**: OllamaClient allows proper API mocking for reliable tests with Bun's mock utilities
- **Validation**: OutputProcessor regex patterns tested with various inputs
- **Coverage**: Git command construction logic validated without actual git calls
- **Fast Execution**: Bun's native test runner provides rapid feedback during development

## Common Extension Points

### Adding New AI Models

1. Update default in PRGenerator `run()` method
2. Update CLI option description and README examples
3. Test model compatibility with thinking tags using OutputProcessor
4. Update OllamaClient if new API patterns needed

### Custom Output Formats

- Modify prompt template in OllamaClient `generatePRMessage()`
- Extend OutputProcessor for new formatting requirements
- Add new processing methods to OutputProcessor utility

### Git Analysis Enhancement

- Extend GitAnalyzer with new git command wrappers
- Add new methods to CommitInfo interface
- Handle edge cases (empty repos, single commits) in GitAnalyzer

### Error Recovery

- Implement retry logic in OllamaClient
- Add fallback models in OllamaClient configuration
- Improve git error diagnostics in GitAnalyzer

## Development Workflow

### Adding New Features

1. Identify which utility class should handle the feature
2. Add methods to appropriate utility class with proper TypeScript typing
3. **Write Tests First**: Create unit tests for new methods using Bun's test utilities
4. Update main PRGenerator to use new utility methods
5. **Verify Test Coverage**: Ensure all new code paths are tested with `bun test`
6. Update this CLAUDE.md documentation

### Testing New Features

- **Test-Driven Development**: Write tests before implementing features when possible
- **Bun Test Syntax**: Use `import { test, expect, mock } from 'bun:test'` for testing utilities
- **Mock External Calls**: Mock git commands, API calls, and file system operations
- **Assert Behavior**: Test both success and failure scenarios for robust coverage
- **CI Mode Testing**: Include tests for JSON output format and silent operation behavior

### Debugging Issues

1. Use `--show-thinking` flag to see AI reasoning process
2. Check OllamaClient connection with `testConnection()` method
3. Validate git operations with GitAnalyzer methods
4. Test output processing with OutputProcessor utilities

## File Structure

```
prfect/
├── index.ts                 # Main PRGenerator class
├── .github/
│   └── pull_request_template.md  # Sample GitHub PR template
├── src/utils/
│   ├── index.ts            # Utility exports
│   ├── GitAnalyzer.ts      # Git operations
│   ├── OllamaClient.ts     # AI communication
│   ├── OutputProcessor.ts  # Response processing
│   └── TemplateLoader.ts   # Custom template handling
├── test/
│   ├── index.test.ts       # Core utility tests (Bun test runner)
│   ├── ollama.test.ts      # API communication tests (Bun test runner)
│   ├── cli.test.ts         # CLI option tests (Bun test runner)
│   └── template.test.ts    # Template functionality tests (Bun test runner)
├── package.json             # Includes bun test scripts
└── CLAUDE.md               # This documentation
```

### Test Commands

- `bun test`: Run all tests once
- `bun test --watch`: Run tests in watch mode during development
- `bun test <file>`: Run specific test file
- `bun test --coverage`: Generate test coverage report (if configured)

## Key Benefits of Refactored Architecture

✅ **Testable**: Each utility class can be imported and tested independently  
✅ **Maintainable**: Clear separation of concerns between git, AI, and output processing  
✅ **Extensible**: Easy to add new features to specific utility classes  
✅ **Type-Safe**: Full TypeScript support with proper interfaces  
✅ **Reusable**: Utility classes can be used in other projects or contexts