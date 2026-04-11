import { describe, expect, test } from "bun:test";
import { matchRule, type HookInput } from "./matcher.ts";
import type { Rule } from "./config.ts";

const rules: Rule[] = [
	{
		tool: "WebFetch",
		match: { field: "url", pattern: "https://github.com/shoppingjaws/**" },
		action: "allow",
	},
	{
		tool: "WebFetch",
		match: { field: "url", pattern: "https://evil.example.com/**" },
		action: "deny",
		reason: "blocked",
	},
	{
		tool: "Bash",
		match: { field: "command", pattern: "gh pr *" },
		action: "allow",
	},
];

describe("matchRule", () => {
	test("allows matching URL with **", () => {
		const input: HookInput = {
			tool_name: "WebFetch",
			tool_input: {
				url: "https://github.com/shoppingjaws/cc-permission/blob/main/README.md",
			},
		};
		expect(matchRule(input, rules)).toEqual({ decision: "allow" });
	});

	test("allows matching URL at org root", () => {
		const input: HookInput = {
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/shoppingjaws/repo" },
		};
		expect(matchRule(input, rules)).toEqual({ decision: "allow" });
	});

	test("denies matching URL with reason", () => {
		const input: HookInput = {
			tool_name: "WebFetch",
			tool_input: { url: "https://evil.example.com/something" },
		};
		expect(matchRule(input, rules)).toEqual({
			decision: "deny",
			reason: "blocked",
		});
	});

	test("returns empty for non-matching URL", () => {
		const input: HookInput = {
			tool_name: "WebFetch",
			tool_input: { url: "https://other.com/page" },
		};
		expect(matchRule(input, rules)).toEqual({});
	});

	test("returns empty for non-matching tool", () => {
		const input: HookInput = {
			tool_name: "Read",
			tool_input: { file_path: "/some/file" },
		};
		expect(matchRule(input, rules)).toEqual({});
	});

	test("matches Bash command with *", () => {
		const input: HookInput = {
			tool_name: "Bash",
			tool_input: { command: "gh pr list" },
		};
		expect(matchRule(input, rules)).toEqual({ decision: "allow" });
	});

	test("does not match Bash command without prefix", () => {
		const input: HookInput = {
			tool_name: "Bash",
			tool_input: { command: "rm -rf /" },
		};
		expect(matchRule(input, rules)).toEqual({});
	});

	test("first matching rule wins", () => {
		const overlappingRules: Rule[] = [
			{
				tool: "WebFetch",
				match: { field: "url", pattern: "https://example.com/**" },
				action: "deny",
				reason: "first",
			},
			{
				tool: "WebFetch",
				match: { field: "url", pattern: "https://example.com/allowed/**" },
				action: "allow",
			},
		];
		const input: HookInput = {
			tool_name: "WebFetch",
			tool_input: { url: "https://example.com/allowed/page" },
		};
		expect(matchRule(input, overlappingRules)).toEqual({
			decision: "deny",
			reason: "first",
		});
	});

	test("handles non-string field value", () => {
		const input: HookInput = {
			tool_name: "WebFetch",
			tool_input: { url: 123 },
		};
		expect(matchRule(input, rules)).toEqual({});
	});
});
