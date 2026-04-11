import { addRule, loadAllRules, loadConfig } from "./config.ts";
import { matchRule, type HookInput } from "./matcher.ts";
import { learnRules } from "./learn.ts";
import { log } from "./logger.ts";

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks).toString("utf-8");
}

export async function runHook(): Promise<void> {
	try {
		const raw = await readStdin();
		const input: HookInput = JSON.parse(raw);
		await log("hook:input", input);
		const allRules = loadAllRules();
		const result = matchRule(input, allRules);
		await log("hook:result", result);
		if (result.decision === "allow") {
			process.stderr.write(
				`[cc-permission] auto-allowed: ${input.tool_name} (${result.matchedPattern})\n`,
			);
		}
		const { matchedPattern: _, ...output } = result;
		process.stdout.write(JSON.stringify(output));
	} catch (e) {
		await log("hook:error", { message: String(e), stack: (e as Error).stack });
		process.stdout.write("{}");
	}
}

export async function runPostHook(): Promise<void> {
	try {
		const raw = await readStdin();
		const input: HookInput = JSON.parse(raw);
		await log("post-hook:input", input);
		const config = loadConfig();
		const allRules = loadAllRules();
		const newRules = learnRules(input, config.templates, allRules);
		for (const rule of newRules) {
			const result = addRule(rule);
			if (result.error) {
				await log("post-hook:addRule-error", { rule, error: result.error });
			} else {
				await log("post-hook:rule-added", rule);
			}
		}
		if (newRules.length > 0) {
			const messages = newRules.map(
				(r) => `[cc-permission] rule added: ${r.pattern} (${r.action})`,
			);
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						additionalContext: messages.join("\n"),
					},
				}),
			);
		} else {
			process.stdout.write("{}");
		}
	} catch (e) {
		await log("post-hook:error", { message: String(e), stack: (e as Error).stack });
		process.stdout.write("{}");
	}
}
