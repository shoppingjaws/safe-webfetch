import type { Template, Rule } from "./config.ts";
import type { HookInput } from "./matcher.ts";

/**
 * Convert a match template like "https://github.com/{org}/**" into a regex
 * that captures named placeholders.
 * Placeholders: {name} captures a single path segment ([^/]+)
 * Glob wildcards: ** matches anything, * matches within a segment
 */
function matchTemplateToRegex(template: string): RegExp {
	let regex = "";
	let i = 0;
	while (i < template.length) {
		if (template[i] === "{") {
			const end = template.indexOf("}", i);
			if (end === -1) {
				regex += "\\{";
				i++;
				continue;
			}
			const name = template.slice(i + 1, end);
			regex += `(?<${name}>[^/]+)`;
			i = end + 1;
		} else if (template[i] === "*" && template[i + 1] === "*") {
			i += 2;
			if (regex.endsWith("/")) regex = regex.slice(0, -1);
			if (template[i] === "/") i++;
			regex += "(/.*)?";

		} else if (template[i] === "*") {
			regex += "[^/]*";
			i++;
		} else {
			regex += template[i]?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			i++;
		}
	}
	return new RegExp(`^${regex}$`);
}

/**
 * Extract placeholder values from a value using a match template.
 * Returns null if the value doesn't match the template.
 */
export function extractPlaceholders(
	value: string,
	matchTemplate: string,
): Record<string, string> | null {
	const regex = matchTemplateToRegex(matchTemplate);
	const m = regex.exec(value);
	if (!m?.groups) return null;
	return { ...m.groups };
}

/**
 * Fill placeholders in a generate template with extracted values.
 * e.g. "https://raw.githubusercontent.com/{org}/**" + {org: "xxx"} → "https://raw.githubusercontent.com/xxx/**"
 */
export function fillTemplate(
	template: string,
	placeholders: Record<string, string>,
): string {
	return template.replace(/\{(\w+)\}/g, (_, name: string) => {
		return placeholders[name] ?? `{${name}}`;
	});
}

/**
 * Check if a rule already exists in the rules list (same pattern).
 */
function ruleExists(rule: Rule, existingRules: Rule[]): boolean {
	return existingRules.some((r) => r.pattern === rule.pattern);
}

/**
 * Determine which new rules should be learned from a tool invocation.
 * Returns an array of new rules to add, or empty if nothing to learn.
 */
export function learnRules(
	input: HookInput,
	templates: Template[],
	existingRules: Rule[],
): Rule[] {
	const newRules: Rule[] = [];

	for (const learn of templates) {
		for (const value of Object.values(input.tool_input)) {
			if (typeof value !== "string") continue;

			const placeholders = extractPlaceholders(value, learn.match);
			if (!placeholders) continue;

			for (const generatePattern of learn.generate) {
				const pattern = fillTemplate(generatePattern, placeholders);
				const rule: Rule = {
					pattern,
					action: "allow",
				};
				if (!ruleExists(rule, existingRules) && !ruleExists(rule, newRules)) {
					newRules.push(rule);
				}
			}
			break;
		}
	}

	return newRules;
}
