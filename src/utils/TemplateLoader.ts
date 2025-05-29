import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

export interface TemplateConfig {
  templatePath?: string;
  customTemplate?: string;
}

export class TemplateLoader {
  private static readonly DEFAULT_TEMPLATE_PATHS = [
    ".github/pull_request_template.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "docs/pull_request_template.md",
    ".github/PULL_REQUEST_TEMPLATE/pull_request_template.md",
  ];

  /**
   * Load PR template with fallback priority:
   * 1. Explicit template path from config
   * 2. GitHub standard locations
   * 3. Default built-in template
   */
  public static loadTemplate(config: TemplateConfig = {}): string {
    // 1. Use explicit template path if provided
    if (config.templatePath) {
      return this.loadFromPath(config.templatePath);
    }

    // 2. Use custom template content if provided
    if (config.customTemplate) {
      return config.customTemplate;
    }

    // 3. Search for GitHub standard template locations
    const foundTemplate = this.findGitHubTemplate();
    if (foundTemplate) {
      return foundTemplate;
    }

    // 4. Fall back to default template
    return this.getDefaultTemplate();
  }

  /**
   * Load template from specific file path
   */
  private static loadFromPath(templatePath: string): string {
    try {
      const absolutePath = this.resolveTemplatePath(templatePath);
      if (!existsSync(absolutePath)) {
        throw new Error(`Template file not found: ${absolutePath}`);
      }
      return readFileSync(absolutePath, "utf8");
    } catch (error: any) {
      throw new Error(
        `Failed to load template from ${templatePath}: ${error.message}`
      );
    }
  }

  /**
   * Search for GitHub standard PR template locations
   */
  private static findGitHubTemplate(): string | null {
    const repoRoot = this.findRepositoryRoot();
    if (!repoRoot) return null;

    for (const templatePath of this.DEFAULT_TEMPLATE_PATHS) {
      const fullPath = join(repoRoot, templatePath);
      if (existsSync(fullPath)) {
        try {
          return readFileSync(fullPath, "utf8");
        } catch (error) {
          // Continue searching if this file can't be read
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Find repository root by looking for .git directory
   */
  private static findRepositoryRoot(
    startPath: string = process.cwd()
  ): string | null {
    let currentPath = startPath;

    // Traverse up the directory tree
    for (let i = 0; i < 10; i++) {
      // Limit to prevent infinite loops
      if (existsSync(join(currentPath, ".git"))) {
        return currentPath;
      }

      const parentPath = dirname(currentPath);
      if (parentPath === currentPath) {
        // Reached filesystem root
        break;
      }
      currentPath = parentPath;
    }

    return null;
  }

  /**
   * Resolve template path (handle relative paths)
   */
  private static resolveTemplatePath(templatePath: string): string {
    if (templatePath.startsWith("/")) {
      // Already absolute
      return templatePath;
    }

    // Relative to repository root
    const repoRoot = this.findRepositoryRoot();
    if (repoRoot) {
      return join(repoRoot, templatePath);
    }

    // Relative to current working directory
    return join(process.cwd(), templatePath);
  }

  /**
   * Get default built-in template
   */
  private static getDefaultTemplate(): string {
    return `## Summary
[Brief description of what this PR accomplishes]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Configuration change
- [ ] Test improvement
- [ ] Code refactoring

## Overview
[A brief 1-3 sentence synopsis of the work]

## Key Changes
[Maximum 5 bullet points of the most important changes]
- 
- 
- 

## How has this been tested?
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Edge cases considered

## Breaking Changes
[Only include if there are breaking changes]

## Testing
[Include if applicable, describe how the changes were tested, any new tests added, etc.]`;
  }

  /**
   * Generate AI prompt that incorporates the template
   */
  public static generatePromptWithTemplate(
    template: string,
    commitInfo: any,
    sourceBranch: string,
    targetBranch: string,
    options: { noEmojis?: boolean; context?: string } = {}
  ): string {
    const contextSection = options.context
      ? `

ADDITIONAL CONTEXT:
${options.context}

Consider this additional context when generating the PR description.`
      : "";

    return `You are a senior software engineer reviewing code changes for a pull request.

Based on the following git information, generate a pull request description using the provided template structure:

TEMPLATE STRUCTURE TO FOLLOW:
${template}

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
${commitInfo.codeSample}${contextSection}

INSTRUCTIONS:
- Follow the template structure exactly
- Replace placeholder text with actual content based on the git analysis
- Fill in checkboxes appropriately based on the changes
- Keep the tone professional but concise
- Focus on the business value and technical changes
- Maximum 1000 words total
- Do not use placeholder text like "[Description]" - write the actual content${
      options.noEmojis ? "\n- Do not use any emojis in the response" : ""
    }

Generate the PR description now:`;
  }

  /**
   * Validate template content
   */
  public static validateTemplate(template: string): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!template || template.trim().length === 0) {
      issues.push("Template is empty");
    }

    if (template.length > 10000) {
      issues.push("Template is too long (max 10,000 characters)");
    }

    // Check for common template sections
    const commonSections = ["summary", "overview", "changes"];
    const hasSection = commonSections.some((section) =>
      template.toLowerCase().includes(section)
    );

    if (!hasSection) {
      issues.push(
        "Template should include common sections like Summary, Overview, or Changes"
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
