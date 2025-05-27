#!/usr/bin/env node

/**
 * PR Message Generator using Ollama and DeepSeek
 * Node.js/TypeScript version
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { program } from "commander";
import chalk from "chalk";
import readline from "readline";

interface OllamaResponse {
  response: string;
  done: boolean;
}

interface CommitInfo {
  messages: string;
  fileChanges: string;
  diffStats: string;
  codeSample: string;
}

class PRGenerator {
  private ollamaHost: string;

  constructor(ollamaHost = "http://localhost:11434") {
    this.ollamaHost = ollamaHost;
  }

  private log = {
    info: (msg: string) => console.log(chalk.green("[INFO]"), msg),
    warn: (msg: string) => console.log(chalk.yellow("[WARN]"), msg),
    error: (msg: string) => console.log(chalk.red("[ERROR]"), msg),
    success: (msg: string) => console.log(chalk.green("✓"), msg),
  };

  private runGitCommand(command: string[]): string {
    try {
      return execSync(`git ${command.join(" ")}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch (error: any) {
      throw new Error(
        `Git command failed: ${command.join(" ")}\n${error.message}`
      );
    }
  }

  private isGitRepo(): boolean {
    try {
      this.runGitCommand(["rev-parse", "--git-dir"]);
      return true;
    } catch {
      return false;
    }
  }

  private getCurrentBranch(): string | null {
    try {
      return this.runGitCommand(["branch", "--show-current"]);
    } catch {
      return null;
    }
  }

  private detectDefaultBranch(): string | null {
    // Try to get remote default branch
    try {
      const remoteDefault = this.runGitCommand([
        "symbolic-ref",
        "refs/remotes/origin/HEAD",
      ]);
      if (remoteDefault) {
        return remoteDefault.replace("refs/remotes/origin/", "");
      }
    } catch {
      // Continue to fallback options
    }

    // Check common branch names
    const commonBranches = ["main", "master", "develop", "dev"];

    for (const branch of commonBranches) {
      try {
        // Check if branch exists locally
        this.runGitCommand([
          "show-ref",
          "--verify",
          "--quiet",
          `refs/heads/${branch}`,
        ]);
        return branch;
      } catch {
        try {
          // Check if branch exists remotely
          this.runGitCommand([
            "show-ref",
            "--verify",
            "--quiet",
            `refs/remotes/origin/${branch}`,
          ]);
          return branch;
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  private branchExists(branch: string): boolean {
    try {
      this.runGitCommand([
        "show-ref",
        "--verify",
        "--quiet",
        `refs/heads/${branch}`,
      ]);
      return true;
    } catch {
      try {
        this.runGitCommand([
          "show-ref",
          "--verify",
          "--quiet",
          `refs/remotes/origin/${branch}`,
        ]);
        return true;
      } catch {
        return false;
      }
    }
  }

  private getCommitsInfo(
    sourceBranch: string,
    targetBranch: string
  ): CommitInfo {
    this.log.info(
      `Analyzing commits between ${targetBranch} and ${sourceBranch}...`
    );

    // Get merge base
    const mergeBase = this.runGitCommand([
      "merge-base",
      targetBranch,
      sourceBranch,
    ]);

    // Get commit messages
    let messages = "";
    try {
      messages = this.runGitCommand([
        "log",
        "--oneline",
        "--no-merges",
        `${mergeBase}..${sourceBranch}`,
        "--pretty=format:- %s (%an, %ar)",
      ]);
    } catch (error) {
      this.log.warn("Could not fetch commit messages");
      messages = "No commit messages available";
    }

    // Get file changes summary
    let fileChanges = "";
    try {
      const changes = this.runGitCommand([
        "diff",
        "--name-status",
        `${mergeBase}..${sourceBranch}`,
      ]);
      // Limit to first 20 files
      fileChanges = changes.split("\n").slice(0, 20).join("\n");
    } catch (error) {
      fileChanges = "No file changes detected";
    }

    // Get diff statistics
    let diffStats = "";
    try {
      diffStats = this.runGitCommand([
        "diff",
        "--stat",
        `${mergeBase}..${sourceBranch}`,
      ]);
    } catch (error) {
      diffStats = "No diff statistics available";
    }

    // Get sample of actual changes
    let codeSample = "";
    try {
      const diff = this.runGitCommand([
        "diff",
        `${mergeBase}..${sourceBranch}`,
        "--unified=3",
      ]);
      // Limit to first 100 lines
      codeSample = diff.split("\n").slice(0, 100).join("\n");
    } catch (error) {
      codeSample = "No code changes available";
    }

    return {
      messages,
      fileChanges,
      diffStats,
      codeSample,
    };
  }

  private async checkOllamaSetup(model: string): Promise<boolean> {
    this.log.info("Checking Ollama setup...");

    try {
      // Check if Ollama is running
      const response = await fetch(`${this.ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      // Check if model exists
      const data = await response.json();
      const availableModels = Array.isArray((data as any)?.models)
        ? (data as any).models.map((m: any) => m.name)
        : [];

      if (!availableModels.includes(model)) {
        this.log.warn(`Model '${model}' not found. Available models:`);
        availableModels.forEach((m: string) => console.log(`  - ${m}`));
        this.log.info("To install DeepSeek: ollama pull deepseek-coder:latest");
        return false;
      }

      this.log.success(`Ollama is running and model '${model}' is available`);
      return true;
    } catch (error: any) {
      this.log.error(`Ollama is not accessible at ${this.ollamaHost}`);
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
    showThinking = false
  ): Promise<string> {
    this.log.info(`Generating PR message using model: ${model}`);

    const prompt = `You are a senior software engineer reviewing code changes for a pull request. 

Based on the following git information, generate a clear and professional pull request description:

BRANCH INFO:
- Source branch: ${sourceBranch}
- Target branch: ${targetBranch}

GIT ANALYSIS:
=== COMMIT MESSAGES ===
${commitInfo.messages}

=== FILE CHANGES SUMMARY ===
${commitInfo.fileChanges}

=== DIFF STATISTICS ===
${commitInfo.diffStats}

=== SAMPLE CODE CHANGES ===
${commitInfo.codeSample}

Please generate a PR description with the following structure:

# [Write a clear, direct title here - no placeholder text, just the actual title]

## Overview
A brief 1-3 sentence synopsis of the work.

## Summary
What this PR does and why it's needed. Anything new or changed should be explained here.

## Key Changes
- [Maximum 5 bullet points of the most important changes that reviewers should focus on]
- [Use concise, technical language]
- [Avoid vague terms like "refactor" or "improve" - be specific about what was changed]
- [If applicable, mention any new features or major changes]

## Breaking Changes
[Only include if there are breaking changes]

## Testing
[Include if applicable, describe how the changes were tested, any new tests added, etc.]

Keep the tone professional but concise. Focus on the business value and technical changes. Maximum 1000 words total. Do not use placeholder text like "[Title]" - write the actual content.${
      noEmojis ? " Do not use any emojis in the response." : ""
    }`;

    try {
      const response = await fetch(`${this.ollamaHost}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 1000,
          },
        }),
        signal: AbortSignal.timeout(120000), // 2 minutes
      });

      const result = (await response.json()) as OllamaResponse;
      if (result.response) {
        let processedResponse = result.response;

        // Strip thinking tags unless showThinking is enabled
        if (!showThinking) {
          processedResponse = processedResponse
            .replace(/<think>.*?<\/think>/gis, "")
            .trim();
        }

        return processedResponse;
      } else {
        throw new Error("No response field in Ollama output");
      }
    } catch (error: any) {
      if (error.name === "TimeoutError") {
        throw new Error(
          "Request timed out. The model might be taking too long to respond."
        );
      }
      throw new Error(`Failed to generate PR message: ${error.message}`);
    }
  }

  private saveToFile(content: string, filename?: string): string {
    if (!filename) {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      filename = `pr_message_${timestamp}.md`;
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
      this.log.info(`Auto-detected target branch: ${finalTargetBranch}`);
    }

    // Validate branches exist
    if (!this.branchExists(finalSourceBranch)) {
      throw new Error(`Source branch '${finalSourceBranch}' does not exist`);
    }

    if (!this.branchExists(finalTargetBranch)) {
      throw new Error(`Target branch '${finalTargetBranch}' does not exist`);
    }

    this.log.info(`Source branch: ${finalSourceBranch}`);
    this.log.info(`Target branch: ${finalTargetBranch}`);
    this.log.info(`Model: ${model}`);

    // Check Ollama setup
    const ollamaReady = await this.checkOllamaSetup(model);
    if (!ollamaReady) {
      throw new Error("Ollama setup check failed");
    }

    // Get commits information
    const commitInfo = this.getCommitsInfo(
      finalSourceBranch,
      finalTargetBranch
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
      showThinking
    );

    if (!prMessage) {
      throw new Error("Failed to generate PR message");
    }

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

    return prMessage;
  }
}

// CLI interface
async function main() {
  program
    .name("pr-generator")
    .description("Generate PR messages using Ollama and git analysis")
    .version("1.0.0")
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
    .helpOption("-h, --help", "Display help for command");

  program.parse();

  const options = program.opts();

  try {
    const generator = new PRGenerator(options.ollamaHost);
    await generator.run({
      source: options.source,
      target: options.target,
      model: options.model,
      save: options.save,
      interactive: options.interactive,
      noEmojis: options.noEmojis,
      showThinking: options.showThinking,
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
