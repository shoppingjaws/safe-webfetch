#!/usr/bin/env bun

const command = process.argv[2];

switch (command) {
	case "hook": {
		const { runHook } = await import("./hook.ts");
		await runHook();
		break;
	}
	case "post-hook": {
		const { runPostHook } = await import("./hook.ts");
		await runPostHook();
		break;
	}
	case "init": {
		const { runInit } = await import("./init.ts");
		runInit();
		break;
	}
	default:
		console.error("Usage: cc-permission <hook|post-hook|init>");
		process.exit(1);
}
