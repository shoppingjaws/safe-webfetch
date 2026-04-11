import type { Rule } from "./config.ts";

export interface HookInput {
	tool_name: string;
	tool_input: Record<string, unknown>;
}

export interface HookOutput {
	decision?: "allow" | "deny";
	reason?: string;
	/** マッチしたルールのパターン（ログ用、JSON出力には含めない） */
	matchedPattern?: string;
}

function globToRegex(pattern: string): RegExp {
	let regex = "";
	let i = 0;
	while (i < pattern.length) {
		const char = pattern.charAt(i);
		if (char === "*" && pattern[i + 1] === "*") {
			i += 2;
			if (regex.endsWith("/")) regex = regex.slice(0, -1);
			if (pattern[i] === "/") i++;
			regex += "(/.*)?";

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
		const regex = globToRegex(rule.pattern);
		for (const value of Object.values(input.tool_input)) {
			if (typeof value !== "string") continue;
			if (regex.test(value)) {
				const result: HookOutput = {
					decision: rule.action,
					matchedPattern: rule.pattern,
				};
				if (rule.action === "deny" && rule.reason) {
					result.reason = rule.reason;
				}
				return result;
			}
		}
	}
	return {};
}
