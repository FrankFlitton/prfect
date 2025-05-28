export class OutputProcessor {
  /**
   * Removes thinking tags from AI response unless showThinking is enabled
   */
  public static processResponse(response: string, showThinking = false): string {
    if (showThinking) {
      return response;
    }
    
    // Strip thinking tags using regex with global, case-insensitive, and dotall flags
    return response.replace(/<think>.*?<\/think>/gis, '').trim();
  }

  /**
   * Generates a timestamp-based filename for PR messages
   */
  public static generateFilename(prefix = "pr_message", extension = "md"): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    return `${prefix}_${timestamp}.${extension}`;
  }

  /**
   * Limits array content to specified number of items
   */
  public static limitLines(content: string, maxLines: number): string {
    return content.split("\n").slice(0, maxLines).join("\n");
  }

  /**
   * Validates thinking tag regex pattern
   */
  public static hasThinkingTags(content: string): boolean {
    return /<think>.*?<\/think>/gis.test(content);
  }

  /**
   * Extracts thinking content from tags
   */
  public static extractThinkingContent(content: string): string[] {
    const matches = content.match(/<think>(.*?)<\/think>/gis);
    if (!matches) return [];
    
    return matches.map(match => 
      match.replace(/<\/?think>/gi, '').trim()
    );
  }

  /**
   * Counts thinking tag occurrences
   */
  public static countThinkingTags(content: string): number {
    const matches = content.match(/<think>.*?<\/think>/gis);
    return matches ? matches.length : 0;
  }

  /**
   * Validates file extension for output files
   */
  public static validateFileExtension(filename: string, allowedExtensions = ['md', 'txt']): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedExtensions.includes(extension) : false;
  }

  /**
   * Formats content with proper line breaks and spacing
   */
  public static formatContent(content: string): string {
    return content
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace from start and end
      .replace(/[ \t]+$/gm, ''); // Remove trailing whitespace from lines
  }

  /**
   * Strips ANSI color codes from content
   */
  public static stripAnsiCodes(content: string): string {
    // eslint-disable-next-line no-control-regex
    return content.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Extracts title and body from PR message for CI mode
   */
  public static extractTitleAndBody(prMessage: string): { title: string; body: string } {
    const lines = prMessage.trim().split('\n');
    
    // Find the first non-empty line as title
    let title = '';
    let bodyStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !title) {
        // Remove common PR title prefixes and markdown headers
        title = line.replace(/^#+\s*/, '').replace(/^(feat|fix|docs|style|refactor|test|chore):\s*/i, '').trim();
        bodyStartIndex = i + 1;
        break;
      }
    }
    
    // Skip empty lines after title and collect body
    while (bodyStartIndex < lines.length && !lines[bodyStartIndex].trim()) {
      bodyStartIndex++;
    }
    
    const body = lines.slice(bodyStartIndex).join('\n').trim();
    
    return {
      title: title || 'Auto-generated PR',
      body: body || 'No description provided'
    };
  }
}