import { test, expect, describe } from "bun:test";
import { TemplateLoader } from "../src/utils/TemplateLoader";

describe("TemplateLoader", () => {
  describe("loadTemplate", () => {
    test("should use custom template content when provided", () => {
      const customTemplate = "## Inline Template\nThis is inline content";
      
      const result = TemplateLoader.loadTemplate({ customTemplate });
      
      expect(result).toBe(customTemplate);
    });

    test("should return default template when no custom options provided", () => {
      const result = TemplateLoader.loadTemplate({});
      
      expect(result).toContain("## Summary");
      expect(result).toContain("## Type of Change");
      expect(result).toContain("## Key Changes");
    });

    test("should detect GitHub template if it exists", () => {
      // Test the actual GitHub template detection
      const result = TemplateLoader.loadTemplate({});
      
      // Should either use GitHub template or default, both should have Summary section
      expect(result).toContain("Summary");
      expect(result.length).toBeGreaterThan(100); // Should be substantial content
    });
  });

  describe("generatePromptWithTemplate", () => {
    test("should generate AI prompt with template structure", () => {
      const template = "## Summary\n[Description]\n## Changes\n- Change 1\n- Change 2";
      const commitInfo = {
        messages: "feat: add new feature",
        fileChanges: "src/app.ts: 10 additions, 2 deletions",
        diffStats: "+10 -2",
        codeSample: "function newFeature() { return true; }"
      };

      const prompt = TemplateLoader.generatePromptWithTemplate(
        template,
        commitInfo,
        "feature/test",
        "main",
        { noEmojis: true }
      );

      expect(prompt).toContain("TEMPLATE STRUCTURE TO FOLLOW:");
      expect(prompt).toContain(template);
      expect(prompt).toContain("Source branch: feature/test");
      expect(prompt).toContain("Target branch: main");
      expect(prompt).toContain("feat: add new feature");
      expect(prompt).toContain("Do not use any emojis");
    });

    test("should handle emoji option correctly", () => {
      const template = "## Summary\n[Description]";
      const commitInfo = {
        messages: "test commit",
        fileChanges: "test.ts",
        diffStats: "+1 -0",
        codeSample: "test code"
      };

      const promptWithEmojis = TemplateLoader.generatePromptWithTemplate(
        template,
        commitInfo,
        "test",
        "main",
        { noEmojis: false }
      );

      const promptWithoutEmojis = TemplateLoader.generatePromptWithTemplate(
        template,
        commitInfo,
        "test", 
        "main",
        { noEmojis: true }
      );

      expect(promptWithEmojis).not.toContain("Do not use any emojis");
      expect(promptWithoutEmojis).toContain("Do not use any emojis");
    });
  });

  describe("validateTemplate", () => {
    test("should validate correct template", () => {
      const validTemplate = "## Summary\nDescription here\n## Overview\nMore details";
      
      const result = TemplateLoader.validateTemplate(validTemplate);
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test("should reject empty template", () => {
      const result = TemplateLoader.validateTemplate("");
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Template is empty");
    });

    test("should reject template that is too long", () => {
      const longTemplate = "a".repeat(10001);
      
      const result = TemplateLoader.validateTemplate(longTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Template is too long (max 10,000 characters)");
    });

    test("should warn about missing common sections", () => {
      const template = "Just some random text without proper sections";
      
      const result = TemplateLoader.validateTemplate(template);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Template should include common sections like Summary, Overview, or Changes");
    });

    test("should accept template with common sections", () => {
      const template = "## Summary\nThis has a summary section";
      
      const result = TemplateLoader.validateTemplate(template);
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("Template constants", () => {
    test("should have correct default template paths", () => {
      // Access the private static property for testing
      const paths = (TemplateLoader as any).DEFAULT_TEMPLATE_PATHS;
      
      expect(paths).toContain(".github/pull_request_template.md");
      expect(paths).toContain(".github/PULL_REQUEST_TEMPLATE.md");
      expect(paths).toContain("docs/pull_request_template.md");
    });
  });

  describe("Default template", () => {
    test("should provide sensible default template", () => {
      // Test the default template structure
      const defaultTemplate = (TemplateLoader as any).getDefaultTemplate();
      
      expect(defaultTemplate).toContain("## Summary");
      expect(defaultTemplate).toContain("## Type of Change");
      expect(defaultTemplate).toContain("## Key Changes");
      expect(defaultTemplate).toContain("## How has this been tested?");
      expect(defaultTemplate).toContain("[ ] Bug fix");
      expect(defaultTemplate).toContain("[ ] New feature");
    });
  });
});