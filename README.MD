# 🚀 Prfect

**Perfect PR descriptions, generated with AI**

Prfect is a powerful tool that analyzes your git commits and generates professional pull request descriptions using local AI models via Ollama. No more struggling with blank PR templates or forgetting what you changed!

[![npm version](https://badge.fury.io/js/prfect.svg)](https://badge.fury.io/js/prfect)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🧠 **AI-Powered**: Uses Ollama with DeepSeek or other local models
- 🔍 **Smart Git Analysis**: Analyzes commits, file changes, and code diffs
- 🌲 **Branch Intelligence**: Auto-detects main/master/develop branches
- 📝 **Professional Output**: Generates structured, readable PR descriptions
- 📋 **Custom Templates**: Supports GitHub PR templates and custom formats
- 🎯 **Context Support**: Add custom context and background information to AI prompts
- 🎨 **Beautiful CLI**: Colored output with progress indicators
- 💾 **Export Options**: Save to markdown files
- 🌐 **Flexible**: Works with any git branching strategy

## 🎯 Quick Start

### Prerequisites

1. **Install Ollama**:

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
ollama pull qwen3:latest
```

2. **Ensure you're in a git repository**

### Installation & Usage

Choose your preferred version:

#### 🟢 Node.js/TypeScript

```bash
# Install globally
npm install -g prfect

# Or run directly with npx
npx prfect

# Basic usage
prfect

# With options
prfect --source feature/auth --target main --save
```

## 🎯 Context Support

Enhance your PR descriptions by providing additional context that may not be visible in the code changes. Perfect for adding ticket numbers, business context, or background information.

### Usage

```bash
# Basic context
prfect "This was a big refactor that addressed Linear ticket BE-123"

# Context with background info
prfect "Fixes critical bug from user reports. Addresses performance issues in checkout flow"

# Context with follow-up information
prfect "Implements OAuth integration per security requirements. Follow up for MFA coming in BE-124"

# Context in CI mode
prfect "Emergency hotfix for production issue" --ci --source hotfix/payment-bug --target main
```

### What Context Helps With

- **📋 Ticket References**: Link to Linear, Jira, or other project management tools
- **💼 Business Context**: Explain the business reason or user impact
- **🔗 Dependencies**: Note related work or follow-up tasks
- **⚠️ Urgency**: Indicate if this is a hotfix or time-sensitive change
- **📊 Performance**: Provide benchmarks or performance context
- **🔒 Security**: Add security considerations or compliance notes

### Context Integration

The context is automatically incorporated into:
- **Default prompts**: Added as "ADDITIONAL CONTEXT" section
- **Custom templates**: Seamlessly integrated into template-based generation
- **CI mode**: Included in automated PR generation
- **All AI models**: Works with any Ollama-compatible model

## 📝 Custom PR Templates

Prfect supports custom PR templates to match your team's workflow and requirements. It automatically detects and uses GitHub standard templates or allows you to specify custom ones.

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

# CI mode with custom template
prfect --ci --template-path templates/ci_template.md
```

### Template Structure

Templates should include common sections that Prfect will intelligently fill:

```markdown
## Summary
[Brief description of changes]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Key Changes
- 
- 
- 

## How has this been tested?
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Edge cases considered

## Breaking Changes
[Only include if there are breaking changes]

## Additional Notes
[Any additional information for reviewers]
```

### Template Features

- **🏢 Mono-repo Support**: Searches up directory tree for templates
- **✅ Validation**: Checks template structure and content quality
- **🔗 GitHub Integration**: Works seamlessly with GitHub's PR template system
- **🔄 Fallback Handling**: Uses default template if custom one not found
- **🎯 Smart Parsing**: AI understands your template structure and fills it appropriately

### Example: Team-Specific Template

Create `.github/pull_request_template.md`:

```markdown
## Summary
[What does this PR accomplish?]

## Business Impact
[How does this benefit users/business?]

## Technical Details
[Implementation approach and key technical decisions]

## Security Considerations
- [ ] No sensitive data exposed
- [ ] Authentication/authorization reviewed
- [ ] Input validation implemented

## Performance Impact
- [ ] No performance degradation
- [ ] Load testing completed (if applicable)

## Testing Strategy
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Accessibility tested (if UI changes)

## Deployment Notes
[Any special deployment considerations]

## Documentation
- [ ] README updated (if needed)
- [ ] API docs updated (if needed)
- [ ] Internal docs updated (if needed)
```

Prfect will automatically detect and use this template for all PRs in your repository!

## 📋 Usage Examples

### Command Line

```bash
# Generate PR for current branch → auto-detected main
prfect

# Specify source branch
prfect --source feature/authentication

# Specify both branches
prfect --source feature/auth --target main

# Use different AI model
prfect --model llama2

# Save to file automatically
prfect --save

# Custom Ollama host
prfect --ollama-host http://192.168.1.100:11434

# Generate without emojis
prfect --no-emojis

# Show AI thinking process (useful for debugging)
prfect --show-thinking

# Use custom PR template
prfect --template-path .github/custom_template.md

# Add context information to the AI prompt
prfect "This was a big refactor that addressed Linear ticket BE-123. Follow up for BE-124 coming soon but non blocking"

# Context with other options
prfect "Fixes critical bug from user reports" --source feature/bugfix --target main --model qwen3:latest
```

### Programmatic Usage (Node.js/TypeScript)

```typescript
import { PRGenerator } from "prfect";

const generator = new PRGenerator();

const prMessage = await generator.run({
  source: "feature/new-feature",
  target: "main",
  model: "qwen3:latest",
  save: true,
  interactive: false,
  noEmojis: true,
  showThinking: false,
  templatePath: ".github/custom_template.md",
  context: "This addresses Linear ticket BE-123",
});

console.log(prMessage);
```

### Integration with Package.json

```json
{
  "scripts": {
    "pr": "prfect",
    "pr:save": "prfect --save --no-interactive",
    "pr:clean": "prfect --no-emojis --save",
    "pr:debug": "prfect --show-thinking",
    "pr:custom": "prfect --template-path .github/custom_template.md"
  }
}
```

## 📊 Sample Output

Prfect generates professional PR descriptions like this:

```markdown
# Implement User Authentication System

## Summary

This PR adds a comprehensive user authentication system with JWT tokens,
password hashing, and role-based access control to improve application security.

## Key Changes

- Added JWT authentication middleware with token validation
- Implemented bcrypt password hashing for secure credential storage
- Created user registration and login API endpoints
- Added role-based permission system with admin/user roles
- Updated database schema with users and roles tables
- Added authentication guards for protected routes

## Breaking Changes

- All API endpoints now require authentication headers
- User session handling has changed from cookies to JWT tokens
- Database migration required for new user tables

## Testing Considerations

- Unit tests added for authentication functions
- Integration tests for login/register workflows
- Manual testing required for UI authentication flows
- Load testing recommended for JWT token validation
```

## 🛠️ Configuration

### Environment Variables

```bash
export OLLAMA_HOST=http://localhost:11434
export PRFECT_MODEL=qwen3:latest
export PRFECT_DEFAULT_TARGET=main
```

### Git Hooks Integration

Add to `.git/hooks/pre-push`:

```bash
#!/bin/sh
if [ "$2" = "origin" ]; then
    prfect --save --no-interactive
fi
```

## 🚀 Installation Options

### Node.js/TypeScript (Full-Featured)

```bash
# Global installation
npm install -g prfect

# Local development
git clone <repository>
cd prfect
npm install
npm run build
npm start
```

**Features:**

- ✅ TypeScript support with full type safety
- ✅ Beautiful CLI with colors and progress
- ✅ Programmatic API for integration
- ✅ Professional error handling
- ✅ Interactive and non-interactive modes
- ✅ Comprehensive logging

## 🎛️ Available AI Models

Prfect works with any Ollama-compatible model:

- **qwen3:latest** (Default)
- **qwen3:0.6b** (Good for CI)
- **gemma3:latest**
- **deepseek-coder:latest**
- **llama3:latest**
- **codellama:latest**
- **mistral**
- **mixtral**

For a complete list visit [Ollama's model hub](https://ollama.com/search) and install them with the Ollama CLI.

Install models with:

```bash
ollama pull <model-name>
```

## 🔧 Advanced Configuration

### Custom Prompts

The Node.js package supports custom prompt templates:

```typescript
const generator = new PRGenerator();
generator.setPromptTemplate(`
Custom prompt for ${sourceBranch} → ${targetBranch}
Analysis: ${commitInfo}
Generate: [your requirements]
`);
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Generate PR Description
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  generate-description:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Ollama
        run: |
          curl -fsSL https://ollama.ai/install.sh | sh
          ollama serve &
          ollama pull qwen3:latest
      - name: Generate PR Description
        run: npx prfect --no-interactive --save
```

#### GitLab CI

```yaml
generate-pr:
  stage: prepare
  script:
    - curl -fsSL https://ollama.ai/install.sh | sh
    - ollama serve &
    - ollama pull qwen3:latest
    - npx prfect --no-interactive
```

## 🏗️ Development Setup

### Node.js/TypeScript Development

```bash
# Clone repository
git clone <repository>
cd prfect

# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Project Structure

```
prfect/
├── src/
│   └── index.ts              # Main TypeScript application
├── scripts/
│   ├── prfect.sh            # Bash version
│   └── prfect.py            # Python version
├── dist/                     # Compiled JavaScript
├── package.json             # Node.js configuration
├── tsconfig.json            # TypeScript configuration
└── README.md               # This file
```

## 🐛 Troubleshooting

### Common Issues

**"Not in a git repository"**

```bash
# Ensure you're in a git repository
git status
```

**"Ollama is not accessible"**

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

**"Model not found"**

```bash
# List available models
ollama list

# Install default model
ollama pull qwen3:latest
```

**"Could not detect default branch"**

```bash
# Specify target branch explicitly
prfect --target main
```

**"No commits found"**

```bash
# Check if there are commits between branches
git log --oneline main..feature-branch
```

### Debug Mode

For detailed logging:

```bash
# Node.js version
DEBUG=prfect* prfect

```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) - Local AI model runner
- [DeepSeek Coder](https://github.com/deepseek-ai/DeepSeek-Coder) - Excellent code-focused language model
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal styling

## 📞 Support

For support, please open a new issue on the [GitHub Issues](https://github.com/frankflitton/prfect/issues) page.
