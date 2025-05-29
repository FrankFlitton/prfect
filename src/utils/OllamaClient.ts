export interface OllamaResponse {
  response: string;
  done: boolean;
}

export interface OllamaModel {
  name: string;
  [key: string]: any;
}

export interface OllamaGenerateOptions {
  temperature?: number;
  top_p?: number;
  num_predict?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: OllamaGenerateOptions;
}

export class OllamaClient {
  private host: string;

  constructor(host = "http://localhost:11434") {
    this.host = host;
  }

  /**
   * Check if Ollama is running and get available models
   */
  public async getAvailableModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.host}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { models?: OllamaModel[] };
      return Array.isArray(data?.models) ? data.models : [];
    } catch (error: any) {
      if (error.name === "TimeoutError") {
        throw new Error("Connection to Ollama timed out");
      }
      throw new Error(`Failed to connect to Ollama: ${error.message}`);
    }
  }

  /**
   * Check if a specific model is available
   */
  public async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.some((model) => model.name === modelName);
    } catch {
      return false;
    }
  }

  /**
   * Generate text using Ollama
   */
  public async generate(
    request: OllamaGenerateRequest
  ): Promise<OllamaResponse> {
    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          stream: false, // Always use non-streaming for simplicity
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 1000,
            ...request.options,
          },
        }),
        signal: AbortSignal.timeout(120000), // 2 minutes
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as OllamaResponse;

      if (!result.response) {
        throw new Error("No response field in Ollama output");
      }

      return result;
    } catch (error: any) {
      if (error.name === "TimeoutError") {
        throw new Error(
          "Request timed out. The model might be taking too long to respond."
        );
      }
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Test connection to Ollama
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Ollama host URL
   */
  public getHost(): string {
    return this.host;
  }

  /**
   * Set new Ollama host URL
   */
  public setHost(host: string): void {
    this.host = host;
  }

  /**
   * Validate host URL format
   */
  public static validateHost(host: string): boolean {
    try {
      const url = new URL(host);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Generate PR message with specific prompt template
   */
  public async generatePRMessage(
    model: string,
    commitInfo: any,
    sourceBranch: string,
    targetBranch: string,
    options: { noEmojis?: boolean; template?: string; context?: string } = {}
  ): Promise<string> {
    // Use custom template if provided, otherwise use default structure
    let prompt: string;

    if (options.template) {
      // Import TemplateLoader to use generatePromptWithTemplate
      const { TemplateLoader } = await import("./TemplateLoader");
      prompt = TemplateLoader.generatePromptWithTemplate(
        options.template,
        commitInfo,
        sourceBranch,
        targetBranch,
        { noEmojis: options.noEmojis, context: options.context }
      );
    } else {
      // Use default prompt structure
      const contextSection = options.context
        ? `

ADDITIONAL CONTEXT:
${options.context}

Consider this additional context when generating the PR description.`
        : "";

      prompt = `You are a senior software engineer reviewing code changes for a pull request. 

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
${commitInfo.codeSample}${contextSection}

Please generate a PR description with the following structure:

<pr_description_template>
# [Write a clear, direct title here - no placeholder text, just the actual title]

## Overview
A brief 1-3 sentence synopsis of the work.

## Summary
What this PR does and why it's needed.

## Key Changes
- [Maximum 5 bullet points of the most important changes]

## Breaking Changes
[Only include if there are breaking changes]

## Testing
[Include if applicable, describe how the changes were tested, any new tests added, etc.]
</pr_description_template>

Keep the tone professional but concise. Focus on the business value and technical changes. Maximum 1000 words total. Do not use placeholder text like "[Title]" - write the actual content.${
        options.noEmojis ? " Do not use any emojis in the response." : ""
      }`;
    }

    const response = await this.generate({
      model,
      prompt,
    });

    return response.response;
  }
}
