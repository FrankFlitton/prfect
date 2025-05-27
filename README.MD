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
- 🎨 **Beautiful CLI**: Colored output with progress indicators
- 💾 **Export Options**: Save to markdown files
- 🌐 **Flexible**: Works with any git branching strategy

## 🎯 Quick Start

### Prerequisites

1. **Install Ollama**:

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
ollama pull deepseek-coder:latest
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
```

### Programmatic Usage (Node.js/TypeScript)

```typescript
import { PRGenerator } from "prfect";

const generator = new PRGenerator();

const prMessage = await generator.run({
  source: "feature/new-feature",
  target: "main",
  model: "deepseek-coder:latest",
  save: true,
  interactive: false,
});

console.log(prMessage);
```

### Integration with Package.json

```json
{
  "scripts": {
    "pr": "prfect",
    "pr:save": "prfect --save --no-interactive"
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
export PRFECT_MODEL=deepseek-coder:latest
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

- **deepseek-coder:latest** (Recommended for code)
- **llama2** (General purpose)
- **codellama** (Code-focused)
- **mistral** (Fast and efficient)
- **mixtral** (Advanced reasoning)

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
          ollama pull deepseek-coder:latest
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
    - ollama pull deepseek-coder:latest
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

# Install DeepSeek model
ollama pull deepseek-coder:latest
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

# Python version
python3 prfect.py --verbose

# Bash version
bash -x prfect.sh
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) - Local AI model runner
- [DeepSeek Coder](https://github.com/deepseek-ai/DeepSeek-Coder) - Excellent code-focused language model
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal styling

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/user/prfect/issues)
- **Discussions**: [GitHub Discussions](https://github.com/user/prfect/discussions)
- **Documentation**: [Wiki](https://github.com/user/prfect/wiki)

---

**Made with ❤️ for developers who want perfect PR descriptions**

_Stop writing boring PR descriptions. Let AI do it for you!_
