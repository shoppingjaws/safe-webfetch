import type { Rule } from "./config.ts";

export interface HookInput {
	tool_name: string;
	tool_input: Record<string, unknown>;
}

export interface HookOutput {
	decision?: "allow" | "deny";
	reason?: string;
}

function globToRegex(pattern: string): RegExp {
	let regex = "";
	let i = 0;
	while (i < pattern.length) {
		const char = pattern[i]!;
		if (char === "*" && pattern[i + 1] === "*") {
			regex += ".*";
			i += 2;
			if (pattern[i] === "/") {
				i++; // skip trailing slash after **
			}
		} else if (char === "*") {
			regex += "[^/]*";
			i++;
		} else if (char === "?") {
			regex += "[^/]";
			i++;
		} else {
			regex += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			i++;
		}
	}
	return new RegExp(`^${regex}$`);
}

export function matchRule(input: HookInput, rules: Rule[]): HookOutput {
	for (const rule of rules) {
		if (rule.tool !== input.tool_name) {
			continue;
		}
		const value = input.tool_input[rule.match.field];
		if (typeof value !== "string") {
			continue;
		}
		const regex = globToRegex(rule.match.pattern);
		if (regex.test(value)) {
			const result: HookOutput = { decision: rule.action };
			if (rule.action === "deny" && rule.reason) {
				result.reason = rule.reason;
			}
			return result;
		}
	}
	return {};
}
