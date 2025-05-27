import { execSync } from "child_process";

export interface CommitInfo {
  messages: string;
  fileChanges: string;
  diffStats: string;
  codeSample: string;
}

export class GitAnalyzer {
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

  public isGitRepo(): boolean {
    try {
      this.runGitCommand(["rev-parse", "--git-dir"]);
      return true;
    } catch {
      return false;
    }
  }

  public getCurrentBranch(): string | null {
    try {
      return this.runGitCommand(["branch", "--show-current"]);
    } catch {
      return null;
    }
  }

  public detectDefaultBranch(): string | null {
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

  public branchExists(branch: string): boolean {
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

  public getCommitsInfo(sourceBranch: string, targetBranch: string): CommitInfo {
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

  public getMergeBase(targetBranch: string, sourceBranch: string): string {
    return this.runGitCommand(["merge-base", targetBranch, sourceBranch]);
  }

  public getFileChanges(mergeBase: string, sourceBranch: string, limit = 20): string {
    try {
      const changes = this.runGitCommand([
        "diff",
        "--name-status",
        `${mergeBase}..${sourceBranch}`,
      ]);
      return changes.split("\n").slice(0, limit).join("\n");
    } catch (error) {
      return "No file changes detected";
    }
  }

  public getCodeSample(mergeBase: string, sourceBranch: string, limit = 100): string {
    try {
      const diff = this.runGitCommand([
        "diff",
        `${mergeBase}..${sourceBranch}`,
        "--unified=3",
      ]);
      return diff.split("\n").slice(0, limit).join("\n");
    } catch (error) {
      return "No code changes available";
    }
  }
}