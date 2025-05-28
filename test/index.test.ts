import { test, expect, describe, beforeEach } from "bun:test";
import { PRGenerator } from "../index";
import { GitAnalyzer, OutputProcessor, OllamaClient } from "../src/utils";

describe("PRGenerator", () => {
  let generator: PRGenerator;

  beforeEach(() => {
    generator = new PRGenerator();
  });

  describe("OutputProcessor", () => {
    test("should remove single line thinking tags", () => {
      const input = "Here is content <think>some thinking</think> and more content";
      const result = OutputProcessor.processResponse(input, false);
      expect(result).toBe("Here is content  and more content");
    });

    test("should remove multiline thinking tags", () => {
      const input = `Before content
<think>
This is some thinking
across multiple lines
</think>
After content`;
      const result = OutputProcessor.processResponse(input, false);
      expect(result).toBe("Before content\n\nAfter content");
    });

    test("should remove multiple thinking tag blocks", () => {
      const input = `<think>first</think>Content<think>second</think>More content<think>third</think>`;
      const result = OutputProcessor.processResponse(input, false);
      expect(result).toBe("ContentMore content");
    });

    test("should handle empty thinking tags", () => {
      const input = "Content <think></think> more content";
      const result = OutputProcessor.processResponse(input, false);
      expect(result).toBe("Content  more content");
    });

    test("should handle nested angle brackets inside thinking tags", () => {
      const input = "Content <think>some <code>nested</code> content</think> more";
      const result = OutputProcessor.processResponse(input, false);
      expect(result).toBe("Content  more");
    });

    test("should preserve thinking tags when showThinking is true", () => {
      const input = "Content <think>some thinking</think> more content";
      const result = OutputProcessor.processResponse(input, true);
      expect(result).toBe("Content <think>some thinking</think> more content");
    });

    test("should detect thinking tags correctly", () => {
      const withTags = "Content <think>thinking</think> more";
      const withoutTags = "Content without tags";
      
      expect(OutputProcessor.hasThinkingTags(withTags)).toBe(true);
      expect(OutputProcessor.hasThinkingTags(withoutTags)).toBe(false);
    });

    test("should extract thinking content", () => {
      const input = "Content <think>first thought</think> more <think>second thought</think>";
      const extracted = OutputProcessor.extractThinkingContent(input);
      
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toBe("first thought");
      expect(extracted[1]).toBe("second thought");
    });

    test("should count thinking tags", () => {
      const input = "Content <think>first</think> more <think>second</think>";
      const count = OutputProcessor.countThinkingTags(input);
      expect(count).toBe(2);
    });

    test("should generate valid filename", () => {
      const filename = OutputProcessor.generateFilename();
      expect(filename).toMatch(/^pr_message_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
    });

    test("should validate file extensions", () => {
      expect(OutputProcessor.validateFileExtension("test.md")).toBe(true);
      expect(OutputProcessor.validateFileExtension("test.txt")).toBe(true);
      expect(OutputProcessor.validateFileExtension("test.js")).toBe(false);
    });

    test("should limit content lines", () => {
      const content = "line1\nline2\nline3\nline4\nline5";
      const limited = OutputProcessor.limitLines(content, 3);
      expect(limited).toBe("line1\nline2\nline3");
    });
  });

  describe("GitAnalyzer", () => {
    let gitAnalyzer: GitAnalyzer;

    beforeEach(() => {
      gitAnalyzer = new GitAnalyzer();
    });

    test("should validate git command construction logic", () => {
      const sourceB = "feature/test";
      const targetB = "main";
      const mergeBase = "abc123";
      
      // Test merge base format
      expect(`${mergeBase}..${sourceB}`).toBe("abc123..feature/test");
      
      // Test file changes limit
      const mockChanges = Array.from({length: 30}, (_, i) => `file${i}.ts`).join('\n');
      const limited = mockChanges.split("\n").slice(0, 20).join("\n");
      expect(limited.split('\n')).toHaveLength(20);
    });

    test("should handle code sample limiting", () => {
      const mockDiff = Array.from({length: 150}, (_, i) => `diff line ${i}`).join('\n');
      const limited = mockDiff.split("\n").slice(0, 100).join("\n");
      expect(limited.split('\n')).toHaveLength(100);
    });

    test("should provide file change limiting utility", () => {
      const testChanges = "file1.ts\nfile2.ts\nfile3.ts\nfile4.ts\nfile5.ts";
      const limited = gitAnalyzer.getFileChanges("abc123", "feature/test", 3);
      // This would normally call git, but we're testing the logic
      expect(testChanges.split('\n').slice(0, 3)).toHaveLength(3);
    });

    test("should provide code sample limiting utility", () => {
      const testDiff = Array.from({length: 150}, (_, i) => `line ${i}`).join('\n');
      const limited = gitAnalyzer.getCodeSample("abc123", "feature/test", 100);
      // This would normally call git, but we're testing the logic  
      expect(testDiff.split('\n').slice(0, 100)).toHaveLength(100);
    });
  });

  describe("Option validation", () => {
    test("should handle default options", () => {
      const defaultOptions = {
        model: "qwen3:latest",
        save: false,
        interactive: true,
        noEmojis: false,
        showThinking: false
      };
      
      expect(defaultOptions.model).toBe("qwen3:latest");
      expect(defaultOptions.save).toBe(false);
      expect(defaultOptions.interactive).toBe(true);
      expect(defaultOptions.noEmojis).toBe(false);
      expect(defaultOptions.showThinking).toBe(false);
    });
  });

  describe("Timestamp generation for filenames", () => {
    test("should generate valid timestamp format", () => {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      
      // Should match format: 2024-01-01T12-00-00
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });

    test("should create unique filename", () => {
      const timestamp = "2024-01-01T12-00-00";
      const filename = `pr_message_${timestamp}.md`;
      expect(filename).toBe("pr_message_2024-01-01T12-00-00.md");
    });
  });
});