// A fake agent provider for TST-0104 (FEAT-0032): plays a scripted session through the
// provider interface, so the engine is tested with no real model (RISK-0017). Every text
// in a script is invented for the tests, never taken from a real session (RISK-0016).

/**
 * A provider whose sessions play `script`: a list of steps for each prompt, in turn.
 * Step kinds: `{ text }`, `{ tool, summary }` (a tool call that runs and is done),
 * `{ edit: path, added, removed }`, `{ plan: [[text, done], ...] }`,
 * `{ ask: tool, summary }` (asks permission; on a denial the turn says so and ends).
 */
export function fakeProvider(agent, script, { id = 'fake-session-1', delay = 0 } = {}) {
  const started = [];
  return {
    agent,
    started,
    async start(options, hooks) {
      started.push(options);
      let turn = 0;
      let stopped = false;
      let n = 0;
      const now = () => new Date(Date.UTC(2026, 9, 22, 12, 0, n++)).toISOString();
      const wait = () => new Promise((r) => setTimeout(r, delay));
      hooks.identified(options.resume ?? id);
      const play = async () => {
        const steps = script[turn] ?? [{ text: 'Nothing more to do.' }];
        turn += 1;
        for (const step of steps) {
          if (stopped) return;
          await wait();
          if (step.text !== undefined) hooks.record({ kind: 'text', at: now(), text: step.text });
          else if (step.tool !== undefined) {
            const tid = `tool-${n}`;
            hooks.record({ kind: 'tool', at: now(), id: tid, name: step.tool, summary: step.summary ?? '', outcome: 'running' });
            await wait();
            hooks.record({ kind: 'tool', at: now(), id: tid, name: step.tool, summary: step.summary ?? '', outcome: 'done' });
          } else if (step.edit !== undefined) hooks.record({ kind: 'edit', at: now(), path: step.edit, added: step.added ?? 1, removed: step.removed ?? 0, diff: `--- a/${step.edit}\n+++ b/${step.edit}\n` });
          else if (step.plan !== undefined) hooks.record({ kind: 'plan', at: now(), steps: step.plan.map(([text, done]) => ({ text, done })) });
          else if (step.ask !== undefined) {
            // Numbered from one on every start, as the providers once were: the reporter must not trust a repeat.
            const tid = `tool-${n}`;
            const answer = await hooks.ask({ id: `ask-${n++}`, toolUse: tid, tool: step.ask, summary: step.summary ?? '' });
            if (!answer.allow) {
              hooks.record({ kind: 'text', at: now(), text: `Not allowed: ${answer.message ?? 'denied'}.` });
              break;
            }
            hooks.record({ kind: 'tool', at: now(), id: tid, name: step.ask, summary: step.summary ?? '', outcome: 'done' });
          }
        }
        if (!stopped) hooks.turnEnded();
      };
      let current = play();
      return {
        async send() {
          await current;
          current = play();
          await current;
        },
        async interrupt() {
          stopped = true;
        },
        async stop() {
          stopped = true;
          hooks.ended();
        },
        get done() {
          return current;
        },
      };
    },
  };
}
