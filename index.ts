#!/usr/bin/env node

/**
 * PR Message Generator using Ollama and DeepSeek
 * Node.js/TypeScript version
 */

import { writeFileSync } from "fs";
import { program } from "commander";
import chalk from "chalk";
import readline from "readline";
import { GitAnalyzer, OutputProcessor, OllamaClient, TemplateLoader, type CommitInfo, type TemplateConfig } from "./src/utils";

class PRGenerator {
  private gitAnalyzer: GitAnalyzer;
  private ollamaClient: OllamaClient;

  constructor(ollamaHost = "http://localhost:11434") {
    this.gitAnalyzer = new GitAnalyzer();
    this.ollamaClient = new OllamaClient(ollamaHost);
  }

  private log = {
    info: (msg: string) => console.log(chalk.green("[INFO]"), msg),
    warn: (msg: string) => console.log(chalk.yellow("[WARN]"), msg),
    error: (msg: string) => console.log(chalk.red("[ERROR]"), msg),
    success: (msg: string) => console.log(chalk.green("✓"), msg),
  };

  private isGitRepo(): boolean {
    return this.gitAnalyzer.isGitRepo();
  }

  private getCurrentBranch(): string | null {
    return this.gitAnalyzer.getCurrentBranch();
  }

  private detectDefaultBranch(): string | null {
    return this.gitAnalyzer.detectDefaultBranch();
  }

  private branchExists(branch: string): boolean {
    return this.gitAnalyzer.branchExists(branch);
  }

  private getCommitsInfo(sourceBranch: string, targetBranch: string, silent = false): CommitInfo {
    if (!silent) {
      this.log.info(
        `Analyzing commits between ${targetBranch} and ${sourceBranch}...`
      );
    }
    return this.gitAnalyzer.getCommitsInfo(sourceBranch, targetBranch);
  }

  private async checkOllamaSetup(model: string): Promise<boolean> {
    this.log.info("Checking Ollama setup...");

    try {
      const availableModels = await this.ollamaClient.getAvailableModels();
      const modelNames = availableModels.map(m => m.name);

      if (!modelNames.includes(model)) {
        this.log.warn(`Model '${model}' not found. Available models:`);
        modelNames.forEach((m: string) => console.log(`  - ${m}`));
        this.log.info("To install a model: ollama pull <model-name>");
        return false;
      }

      this.log.success(`Ollama is running and model '${model}' is available`);
      return true;
    } catch (error: any) {
      this.log.error(`Ollama is not accessible at ${this.ollamaClient.getHost()}`);
      this.log.error("Make sure Ollama is running: ollama serve");
      return false;
    }
  }

  private async generatePRMessage(
    commitInfo: CommitInfo,
    model: string,
    sourceBranch: string,
    targetBranch: string,
    noEmojis = false,
    showThinking = false,
    silent = false,
    templatePath?: string,
    context?: string
  ): Promise<string> {
    if (!silent) {
      this.log.info(`Generating PR message using model: ${model}`);
    }

    try {
      // Load template
      const template = TemplateLoader.loadTemplate({ templatePath });
      if (!silent && templatePath) {
        this.log.info(`Using custom template: ${templatePath}`);
      } else if (!silent) {
        const hasGitHubTemplate = TemplateLoader.loadTemplate({}) !== TemplateLoader.loadTemplate({ customTemplate: "dummy" });
        if (hasGitHubTemplate) {
          this.log.info("Using GitHub PR template");
        } else {
          this.log.info("Using default template");
        }
      }

      const response = await this.ollamaClient.generatePRMessage(
        model,
        commitInfo,
        sourceBranch,
        targetBranch,
        { noEmojis, template, context }
      );

      return OutputProcessor.processResponse(response, showThinking);
    } catch (error: any) {
      throw new Error(`Failed to generate PR message: ${error.message}`);
    }
  }

  private saveToFile(content: string, filename?: string): string {
    if (!filename) {
      filename = OutputProcessor.generateFilename();
    }

    writeFileSync(filename, content, "utf8");
    return filename;
  }

  private async promptUser(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`${question} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase().startsWith("y"));
      });
    });
  }

  async run(
    options: {
      source?: string;
      target?: string;
      model?: string;
      save?: boolean;
      interactive?: boolean;
      noEmojis?: boolean;
      showThinking?: boolean;
      ci?: boolean;
      templatePath?: string;
      context?: string;
    } = {}
  ): Promise<string> {
    const {
      source: sourceBranch,
      target: targetBranch,
      model = "qwen3:latest",
      save = false,
      interactive = true,
      noEmojis = false,
      showThinking = false,
      ci = false,
      templatePath,
      context,
    } = options;

    // Check if in git repo
    if (!this.isGitRepo()) {
      throw new Error("Not in a git repository");
    }

    // Determine source branch
    let finalSourceBranch = sourceBranch;
    if (!finalSourceBranch) {
      finalSourceBranch = this.getCurrentBranch() ?? undefined;
      if (!finalSourceBranch) {
        throw new Error("Could not determine current branch");
      }
    }

    // Determine target branch
    let finalTargetBranch = targetBranch;
    if (!finalTargetBranch) {
      finalTargetBranch = this.detectDefaultBranch() ?? undefined;
      if (!finalTargetBranch) {
        throw new Error(
          "Could not detect default branch. Please specify target branch."
        );
      }
      if (!ci) {
        this.log.info(`Auto-detected target branch: ${finalTargetBranch}`);
      }
    }

    // Validate branches exist
    if (!this.branchExists(finalSourceBranch)) {
      throw new Error(`Source branch '${finalSourceBranch}' does not exist`);
    }

    if (!this.branchExists(finalTargetBranch)) {
      throw new Error(`Target branch '${finalTargetBranch}' does not exist`);
    }

    if (!ci) {
      this.log.info(`Source branch: ${finalSourceBranch}`);
      this.log.info(`Target branch: ${finalTargetBranch}`);
      this.log.info(`Model: ${model}`);
    }

    // Check Ollama setup (skip verbose output in CI mode)
    if (ci) {
      try {
        const availableModels = await this.ollamaClient.getAvailableModels();
        const modelNames = availableModels.map(m => m.name);
        if (!modelNames.includes(model)) {
          throw new Error(`Model '${model}' not found`);
        }
      } catch (error: any) {
        throw new Error(`Ollama is not accessible at ${this.ollamaClient.getHost()}`);
      }
    } else {
      const ollamaReady = await this.checkOllamaSetup(model);
      if (!ollamaReady) {
        throw new Error("Ollama setup check failed");
      }
    }

    // Get commits information
    const commitInfo = this.getCommitsInfo(
      finalSourceBranch,
      finalTargetBranch,
      ci
    );

    if (!commitInfo.messages && !commitInfo.fileChanges) {
      throw new Error(
        `No commits found between ${finalTargetBranch} and ${finalSourceBranch}`
      );
    }

    // Generate PR message
    const prMessage = await this.generatePRMessage(
      commitInfo,
      model,
      finalSourceBranch,
      finalTargetBranch,
      noEmojis,
      showThinking,
      ci,
      templatePath,
      context
    );

    if (!prMessage) {
      throw new Error("Failed to generate PR message");
    }

    // Handle CI mode output
    if (ci) {
      const { title, body } = OutputProcessor.extractTitleAndBody(prMessage);
      const output = {
        title,
        body,
        source_branch: finalSourceBranch,
        target_branch: finalTargetBranch
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      // Display result
      console.log(`\n${chalk.blue.bold("=== GENERATED PR MESSAGE ===")}`);
      console.log("=".repeat(50));
      console.log(prMessage);
      console.log("=".repeat(50));
      this.log.success("PR message generated successfully!");

      // Save to file if requested or prompted
      if (
        save ||
        (interactive && (await this.promptUser("Save PR message to file?")))
      ) {
        const filename = this.saveToFile(prMessage);
        this.log.success(`PR message saved to: ${filename}`);
      }
    }

    return prMessage;
  }
}

// CLI interface
async function main() {
  program
    .name("pr-generator")
    .description("Generate PR messages using Ollama and git analysis")
    .version("__VERSION__")
    .argument(
      "[context]",
      "Additional context to include in the AI prompt (e.g., ticket numbers, background info)"
    )
    .option(
      "-s, --source <branch>",
      "Source branch with changes (default: current branch)"
    )
    .option(
      "-t, --target <branch>",
      "Target branch (default: auto-detect main/master)"
    )
    .option("-m, --model <model>", "Ollama model name", "qwen3:latest")
    .option("--ollama-host <url>", "Ollama host URL", "http://localhost:11434")
    .option("--save", "Save PR message to file")
    .option("--no-interactive", "Disable interactive prompts")
    .option("--no-emojis", "Generate PR message without emojis")
    .option(
      "--show-thinking",
      "Show AI thinking process (useful for debugging)"
    )
    .option(
      "--ci",
      "CI mode: output PR title and body as JSON for GitHub Actions"
    )
    .option(
      "--template-path <path>",
      "Path to custom PR template file (default: auto-detect GitHub template)"
    )
    .helpOption("-h, --help", "Display help for command");

  program.parse();

  const options = program.opts();
  const context = program.args[0]; // Get the context argument

  try {
    const generator = new PRGenerator(options.ollamaHost);
    await generator.run({
      source: options.source,
      target: options.target,
      model: options.model,
      save: options.save,
      interactive: options.interactive,
      noEmojis: !options.emojis, // Convert emojis flag to noEmojis
      showThinking: options.showThinking,
      ci: options.ci,
      templatePath: options.templatePath,
      context,
    });
  } catch (error: any) {
    console.error(chalk.red("[ERROR]"), error.message);
    process.exit(1);
  }
}

// Export for use as a module
export { PRGenerator };

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red("[ERROR]"), error.message);
    process.exit(1);
  });
}
