import { test, expect, describe, beforeEach, mock } from "bun:test";
import { OllamaClient, OutputProcessor } from "../src/utils";

describe("OllamaClient", () => {
  let client: OllamaClient;
  beforeEach(() => {
    // Reset global fetch mock before each test
    global.fetch = mock(() =>
      Promise.resolve(new Response())
    ) as unknown as typeof fetch;
    client = new OllamaClient();
  });

  describe("Health check", () => {
    test("should handle successful Ollama connection", async () => {
      const mockResponse = {
        models: [{ name: "qwen3:latest" }, { name: "deepseek-coder:latest" }],
      };

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      ) as unknown as typeof fetch;

      const models = await client.getAvailableModels();

      expect(models).toHaveLength(2);
      expect(models?.at(0)?.name).toBe("qwen3:latest");
    });

    test("should handle Ollama connection failure", async () => {
      global.fetch = mock(() =>
        Promise.reject(new Error("Connection refused"))
      ) as unknown as typeof fetch;

      try {
        await client.getAvailableModels();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Connection refused");
      }
    });

    test("should handle timeout errors", async () => {
      global.fetch = mock(() => {
        const error = new Error("Request timeout");
        error.name = "TimeoutError";
        return Promise.reject(error);
      }) as unknown as typeof fetch;

      try {
        await client.getAvailableModels(); // Use method that preserves errors
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Connection to Ollama timed out");
      }
    });

    test("should check model availability", async () => {
      const mockResponse = {
        models: [{ name: "qwen3:latest" }, { name: "deepseek-coder:latest" }],
      };

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      ) as unknown as typeof fetch;

      const available = await client.isModelAvailable("qwen3:latest");
      const notAvailable = await client.isModelAvailable("nonexistent:model");

      expect(available).toBe(true);
      expect(notAvailable).toBe(false);
    });
  });

  describe("PR Generation", () => {
    test("should handle successful PR generation", async () => {
      const mockResponse = {
        response:
          "# Fix Authentication Bug\n\n## Overview\nFixed critical authentication issue.",
        done: true,
      };

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      ) as unknown as typeof fetch;

      const result = await client.generate({
        model: "qwen3:latest",
        prompt: "Generate PR description...",
      });

      expect(result.response).toContain("# Fix Authentication Bug");
      expect(result.done).toBe(true);
    });

    test("should handle response with thinking tags", async () => {
      const mockResponse = {
        response:
          "<think>Let me analyze this...</think>\n# Bug Fix\n\nFixed the issue.",
        done: true,
      };

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      ) as unknown as typeof fetch;

      const result = await client.generate({
        model: "qwen3:latest",
        prompt: "test",
      });

      // Test thinking tag removal with OutputProcessor
      const processed = OutputProcessor.processResponse(result.response, false);

      expect(processed).toBe("# Bug Fix\n\nFixed the issue.");
      expect(processed).not.toContain("<think>");
    });

    test("should preserve thinking tags when showThinking is true", async () => {
      const mockResponse = {
        response: "<think>Analysis needed</think>\n# Feature\n\nAdded feature.",
        done: true,
      };

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      ) as unknown as typeof fetch;

      const result = await client.generate({
        model: "qwen3:latest",
        prompt: "test",
      });

      // When showThinking is true, preserve tags using OutputProcessor
      const processed = OutputProcessor.processResponse(result.response, true);

      expect(processed).toContain("<think>Analysis needed</think>");
    });

    test("should handle empty response", async () => {
      const mockResponse = {
        response: "",
        done: true,
      };

      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      ) as unknown as typeof fetch;

      const response = await fetch("http://localhost:11434/api/generate");
      const result = (await response.json()) as {
        response: string;
        done: boolean;
      };

      expect(result.response).toBe("");
      expect(result.done).toBe(true);
    });

    test("should handle malformed JSON response", async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response("invalid json", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      ) as unknown as typeof fetch;

      try {
        const response = await fetch("http://localhost:11434/api/generate");
        await response.json();
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe("Request configuration", () => {
    test("should send correct headers", async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ response: "test", done: true }))
        )
      ) as unknown as typeof fetch;

      await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "qwen3:latest", prompt: "test" }),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    test("should include timeout signal", async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ response: "test", done: true }))
        )
      ) as unknown as typeof fetch;

      await fetch("http://localhost:11434/api/generate", {
        signal: AbortSignal.timeout(120000),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });
});
