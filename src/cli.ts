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
	case "log": {
		const subCommand = process.argv[3];
		if (subCommand === "show") {
			const { runLogShow } = await import("./log-show.ts");
			await runLogShow();
		} else {
			console.error("Usage: cc-permission log <show>");
			process.exit(1);
		}
		break;
	}
	default:
		console.error("Usage: cc-permission <hook|post-hook|init|log>");
		process.exit(1);
}
