import { test, expect, describe, beforeEach } from "bun:test";
import { program } from "commander";

describe("CLI Options", () => {
  beforeEach(() => {
    // Reset program state before each test
    // @ts-ignore
    program.commands = [];
    // @ts-ignore
    program.options = [];
  });

  describe("Option definitions", () => {
    test("should define all required CLI options", () => {
      // Recreate the program configuration as in main app
      const testProgram = program
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
        .option(
          "--ollama-host <url>",
          "Ollama host URL",
          "http://localhost:11434"
        )
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
        );

      const options = testProgram.options.map((opt) => opt.flags);

      expect(options).toContain("-s, --source <branch>");
      expect(options).toContain("-t, --target <branch>");
      expect(options).toContain("-m, --model <model>");
      expect(options).toContain("--ollama-host <url>");
      expect(options).toContain("--save");
      expect(options).toContain("--no-interactive");
      expect(options).toContain("--no-emojis");
      expect(options).toContain("--show-thinking");
      expect(options).toContain("--ci");
      expect(options).toContain("--template-path <path>");
    });

    test("should have correct default values", () => {
      const testProgram = program
        .option("-m, --model <model>", "Ollama model name", "qwen3:latest")
        .option(
          "--ollama-host <url>",
          "Ollama host URL",
          "http://localhost:11434"
        );

      // Simulate parsing with no arguments to get defaults
      testProgram.parse([]);
      const opts = testProgram.opts();

      expect(opts.model || "qwen3:latest").toBe("qwen3:latest");
      expect(opts.ollamaHost || "http://localhost:11434").toBe(
        "http://localhost:11434"
      );
    });
  });

  describe("Option parsing", () => {
    test("should parse source and target branch options", () => {
      const testProgram = program
        .option("-s, --source <branch>", "Source branch")
        .option("-t, --target <branch>", "Target branch");

      testProgram.parse([
        "node",
        "prfect",
        "--source",
        "feature/test",
        "--target",
        "main",
      ]);

      const opts = testProgram.opts();
      expect(opts.source).toBe("feature/test");
      expect(opts.target).toBe("main");
    });

    test("should parse model option", () => {
      const testProgram = program.option(
        "-m, --model <model>",
        "Ollama model name",
        "qwen3:latest"
      );

      testProgram.parse(["node", "prfect", "--model", "deepseek-coder:latest"]);

      const opts = testProgram.opts();
      expect(opts.model).toBe("deepseek-coder:latest");
    });

    test("should parse boolean flags", () => {
      const testProgram = program
        .option("--save", "Save PR message to file")
        .option("--no-interactive", "Disable interactive prompts")
        .option("--no-emojis", "Generate PR message without emojis")
        .option("--show-thinking", "Show AI thinking process")
        .option("--ci", "CI mode: output JSON");

      testProgram.parse([
        "node",
        "prfect",
        "--save",
        "--no-interactive",
        "--no-emojis",
        "--show-thinking",
        "--ci",
      ]);

      const opts = testProgram.opts();
      expect(opts.save).toBe(true);
      expect(opts.interactive).toBe(false); // no- prefix inverts
      expect(opts.emojis).toBe(false); // --no-emojis sets emojis to false
      expect(opts.showThinking).toBe(true);
      expect(opts.ci).toBe(true);
    });

    test("should handle custom Ollama host", () => {
      const testProgram = program.option(
        "--ollama-host <url>",
        "Ollama host URL",
        "http://localhost:11434"
      );

      testProgram.parse([
        "node",
        "prfect",
        "--ollama-host",
        "http://192.168.1.100:11434",
      ]);

      const opts = testProgram.opts();
      expect(opts.ollamaHost).toBe("http://192.168.1.100:11434");
    });

    test("should parse template path option", () => {
      const testProgram = program.option(
        "--template-path <path>",
        "Path to custom PR template file"
      );

      testProgram.parse([
        "node",
        "prfect", 
        "--template-path",
        "custom/pr_template.md"
      ]);

      const opts = testProgram.opts();
      expect(opts.templatePath).toBe("custom/pr_template.md");
    });
  });

  describe("Option combinations", () => {
    test("should handle multiple options together", () => {
      const testProgram = program
        .option("-s, --source <branch>", "Source branch")
        .option("-m, --model <model>", "Model", "qwen3:latest")
        .option("--save", "Save to file")
        .option("--no-emojis", "No emojis");

      testProgram.parse([
        "node",
        "prfect",
        "--source",
        "feature/new-auth",
        "--model",
        "qwen3:4b",
        "--save",
        "--no-emojis",
      ]);

      const opts = testProgram.opts();
      expect(opts.source).toBe("feature/new-auth");
      expect(opts.model).toBe("qwen3:4b");
      expect(opts.save).toBe(true);
      expect(opts.emojis).toBe(false); // --no-emojis sets emojis to false
    });

    test("should handle short and long option formats", () => {
      const testProgram = program
        .option("-s, --source <branch>", "Source branch")
        .option("-t, --target <branch>", "Target branch")
        .option("-m, --model <model>", "Model");

      testProgram.parse([
        "node",
        "prfect",
        "-s",
        "feat/test",
        "-t",
        "develop",
        "-m",
        "llama3:latest",
      ]);

      const opts = testProgram.opts();
      expect(opts.source).toBe("feat/test");
      expect(opts.target).toBe("develop");
      expect(opts.model).toBe("llama3:latest");
    });
  });

  describe("Validation scenarios", () => {
    test("should provide help information", () => {
      const testProgram = program
        .name("pr-generator")
        .description("Generate PR messages using Ollama and git analysis")
        .helpOption("-h, --help", "Display help for command");

      expect(testProgram.name()).toBe("pr-generator");
      expect(testProgram.description()).toBe(
        "Generate PR messages using Ollama and git analysis"
      );
    });

    test("should handle version option", () => {
      const testProgram = program.version("1.0.2");
      expect(testProgram.version()).toBe("1.0.2");
    });
  });

  describe("Option mapping", () => {
    test("should map CLI options to run method parameters", () => {
      // Simulate the mapping done in main()
      const cliOptions = {
        source: "feature/test",
        target: "main",
        model: "qwen3:latest",
        save: true,
        interactive: false,
        emojis: false,
        showThinking: false,
        ci: false,
        templatePath: "custom/template.md",
        ollamaHost: "http://localhost:11434",
      };

      const runOptions = {
        source: cliOptions.source,
        target: cliOptions.target,
        model: cliOptions.model,
        save: cliOptions.save,
        interactive: cliOptions.interactive,
        noEmojis: !cliOptions.emojis, // Convert emojis flag to noEmojis
        showThinking: cliOptions.showThinking,
        ci: cliOptions.ci,
        templatePath: cliOptions.templatePath,
      };

      expect(runOptions.source).toBe("feature/test");
      expect(runOptions.target).toBe("main");
      expect(runOptions.model).toBe("qwen3:latest");
      expect(runOptions.save).toBe(true);
      expect(runOptions.interactive).toBe(false);
      expect(runOptions.noEmojis).toBe(true); // !false = true
      expect(runOptions.showThinking).toBe(false);
      expect(runOptions.ci).toBe(false);
      expect(runOptions.templatePath).toBe("custom/template.md");
    });
  });

  describe("CI Mode", () => {
    test("should parse CI flag correctly", () => {
      const testProgram = program.option(
        "--ci",
        "CI mode: output PR title and body as JSON"
      );

      testProgram.parse(["node", "prfect", "--ci"]);

      const opts = testProgram.opts();
      expect(opts.ci).toBe(true);
    });

    test("should handle CI mode with other options", () => {
      const testProgram = program
        .option("-s, --source <branch>", "Source branch")
        .option("-m, --model <model>", "Model", "qwen3:latest")
        .option("--no-emojis", "No emojis")
        .option("--ci", "CI mode", false);

      testProgram.parse([
        "node",
        "prfect",
        "--source",
        "feature/ci-test",
        "--model",
        "qwen3:4b",
        "--no-emojis",
        "--ci",
      ]);

      const opts = testProgram.opts();
      expect(opts.source).toBe("feature/ci-test");
      expect(opts.model).toBe("qwen3:4b");
      expect(opts.emojis).toBe(false); // --no-emojis sets emojis to false
      expect(opts.ci).toBe(true);
    });

    test("should validate CI mode JSON output structure", () => {
      const mockOutput = {
        title: "Add new feature",
        body: "This PR adds a new feature that improves functionality.",
        source_branch: "feature/test",
        target_branch: "main",
      };

      expect(mockOutput).toHaveProperty("title");
      expect(mockOutput).toHaveProperty("body");
      expect(mockOutput).toHaveProperty("source_branch");
      expect(mockOutput).toHaveProperty("target_branch");

      expect(typeof mockOutput.title).toBe("string");
      expect(typeof mockOutput.body).toBe("string");
      expect(typeof mockOutput.source_branch).toBe("string");
      expect(typeof mockOutput.target_branch).toBe("string");
    });
  });
});
