// TASK-0178 — writes DES-0006's page, docs/designs/DES-0006-agent-sessions.html: the towers
// ring of each workspace as it was when the sessions were recorded (fixtures/agents/<ws>.json),
// with the agent sessions the cockpit recorded drawn over it (fixtures/agents/<ws>-sessions.json,
// made by agents-fixture.mjs). The towers page's code draws the ring; agents-page.js adds the
// layer. Run from desktop/ after `npm run build`:
//   node scripts/agents-page.mjs [--page ../docs/designs/DES-0006-agent-sessions.html] [--your-trainer <root>] [--cockpit <root>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.DECK_TOWERS_NO_DEFAULT = '1';
const { writeTowersPage } = await import('./overview-towers.mjs');
const { startOf } = await import('./agents-notes.mjs');

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.join(here, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const fixtures = path.join(desktop, 'fixtures', 'agents');
const pagePath = path.resolve(option('--page', path.join(desktop, '..', 'docs', 'designs', 'DES-0006-agent-sessions.html')));
const choices = {
  deck: { label: 'Deck', root: path.join(desktop, '..') },
  'your-trainer': { label: 'your-trainer', root: path.resolve(option('--your-trainer', path.join(desktop, '..', '..', 'your-trainer'))) },
  cockpit: { label: 'project-os-cockpit', root: path.resolve(option('--cockpit', path.join(desktop, '..', '..', 'project-os-cockpit'))) },
};

const css = `
/* DES-0006 (TASK-0178): agents, the session pane, Needs you's new sections, the overview panels, the drawer. */
#legend { display: none; }
/* The towers page's pictures stand over the towers and would cover the agents standing there. */
#evidence { display: none !important; }
#legend.shown { display: block; z-index: 6; }
#overview, #agents { position: fixed; left: 16px; width: 380px; max-width: calc(100vw - 32px); padding: 10px 12px; border-radius: 10px; background: hsla(210, 50%, 8%, 0.94); border: 1px solid hsla(190, 90%, 65%, 0.3); z-index: 2; box-sizing: border-box; }
#overview { top: var(--top, 60px); }
#agents { top: calc(var(--top, 60px) + 300px); max-height: 190px; overflow: auto; }
#overview h4, #agents h4 { margin: 8px 0 4px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; display: flex; justify-content: space-between; color: hsl(190 90% 78%); }
#overview h4:first-child, #agents h4:first-child { margin-top: 0; }
#overview h4 span, #agents h4 span { color: var(--dim); letter-spacing: .04em; text-transform: none; }
#overview .since { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 12px; }
#overview .since span { display: inline-flex; gap: 4px; align-items: center; }
#overview .since button, .session-acts button, #newsession button { background: hsla(190,90%,55%,.16); border: 1px solid var(--line); color: inherit; border-radius: 6px; padding: 3px 9px; font: inherit; font-size: 12px; cursor: pointer; }
#overview .since button { margin-left: auto; }
button[disabled] { opacity: .55; cursor: not-allowed; }
#overview .tiles { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
#overview .tile { padding: 4px 4px 5px; border-radius: 5px; background: hsla(210, 40%, 14%, 0.9); }
#overview .tile .n { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
#overview .tile .w { font-size: 10px; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#overview .mix { display: flex; height: 5px; margin-top: 3px; border-radius: 2px; overflow: hidden; background: hsla(210, 30%, 25%, 0.6); }
#overview .checks { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; }
#overview .checks i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
.ag { display: grid; grid-template-columns: 16px 10px 1fr auto auto; gap: 7px; align-items: center; padding: 3px 4px; border-radius: 5px; cursor: pointer; font-size: 12px; }
.ag:hover { background: hsla(190,90%,55%,.14); }
.ag .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ag .who, .ag .k { color: var(--dim); font-size: 11px; }
.glyph { font-size: 14px; text-align: center; }
.state { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
#needs .nsec { font-size: 12px; margin: 6px 0 2px; color: var(--dim); }
#needs .nsec b { color: var(--ink); }
#queue { width: 380px; }
.session-head { display: flex; gap: 10px; align-items: center; }
.session-head .glyph { font-size: 28px; }
.session-head h2 { margin: 0; }
.meters { margin: 10px 0 4px; }
.meter { display: grid; grid-template-columns: 62px 1fr 44px; gap: 8px; align-items: center; font-size: 12px; margin: 3px 0; }
.meter i { height: 7px; border-radius: 4px; background: hsla(210, 30%, 25%, 0.8); overflow: hidden; display: block; }
.meter b { display: block; height: 100%; }
.meter em { font-style: normal; text-align: right; color: var(--dim); }
.costline { font-size: 12px; color: var(--dim); margin-top: 4px; }
.moved { color: hsl(150 60% 65%); font-size: 11px; flex: none; }
.turn { border: 1px solid hsla(190, 90%, 65%, 0.25); border-radius: 8px; padding: 8px; margin: 4px 0 8px; background: hsla(210, 40%, 12%, 0.7); }
.turn .you { font-size: 12px; color: var(--dim); font-style: italic; margin-bottom: 6px; }
.turn .steps { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.chip { font-size: 11px; padding: 2px 7px; border-radius: 999px; background: hsla(190, 90%, 55%, 0.14); border: 1px solid hsla(190, 90%, 65%, 0.3); }
.ask { border: 1px solid hsla(30, 90%, 60%, 0.35); border-radius: 8px; padding: 6px 8px; margin: 4px 0; font-size: 12px; }
.ask.first { border-color: hsla(30, 90%, 60%, 0.8); background: hsla(30, 60%, 18%, 0.4); }
.answer { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
.answer button { background: hsla(140, 60%, 40%, .3); border: 1px solid hsla(140, 60%, 60%, .5); color: inherit; border-radius: 6px; padding: 3px 12px; font: inherit; font-size: 12px; }
.answer button + button { background: hsla(0, 60%, 40%, .3); border-color: hsla(0, 60%, 60%, .5); }
.session-acts { display: flex; gap: 6px; margin-top: 12px; }
#drawer { position: fixed; left: 412px; right: 332px; bottom: 34px; z-index: 2; }
#drawer .tabs { display: flex; gap: 4px; }
#drawer .tabs button { background: hsla(210, 50%, 8%, 0.94); border: 1px solid hsla(190, 90%, 65%, 0.3); border-bottom: 0; color: var(--dim); border-radius: 6px 6px 0 0; padding: 3px 10px; font: inherit; font-size: 12px; cursor: pointer; }
#drawer .tabs .on, #drawer .tabs .toggle { color: var(--ink); }
#drawer .term { display: none; height: 150px; background: #050a10; border: 1px solid hsla(190, 90%, 65%, 0.3); padding: 8px 10px; font: 12px/1.5 ui-monospace, Menlo, monospace; }
#drawer.open .term { display: block; }
#drawer .cursor { display: inline-block; width: 7px; height: 13px; background: #9ff0ff; vertical-align: -2px; }
#newsession { position: fixed; inset: 0; background: hsla(210, 60%, 3%, 0.6); z-index: 8; display: flex; align-items: center; justify-content: center; }
#newsession[hidden] { display: none; }
#newsession .dialog { width: 440px; max-width: calc(100vw - 32px); background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
#newsession h2 { margin: 0 0 2px; font-size: 16px; }
#newsession label { display: block; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); margin: 12px 0 4px; }
#newsession .prompt { border: 1px solid var(--line); border-radius: 8px; padding: 8px; font-size: 13px; background: hsla(210, 40%, 12%, 0.7); }
#newsession .acts { display: flex; gap: 8px; margin-top: 14px; justify-content: flex-end; }
#card .work { background: hsla(150, 60%, 40%, .3) !important; border-color: hsla(150, 60%, 60%, .5) !important; }
/* Review of TASK-0178: the pane starts below the header; a session's pane is wide; the drawer's tabs clear Next up and the weeks; a ticket's card hides the panels it would cover. */
#panel { top: var(--top, 60px); padding-top: 12px; }
#panel.wide { width: 560px; }
#queue, #weeks { bottom: 66px; }
#panel:not([hidden]) ~ #drawer { right: 396px; }
#panel.wide:not([hidden]) ~ #drawer { right: 576px; }
#card:not([hidden]) ~ #overview, #card:not([hidden]) ~ #agents { visibility: hidden; }
.thread { margin: 4px 0 8px; }
.thread .you { display: flex; gap: 8px; align-items: baseline; justify-content: flex-end; font-size: 12px; color: var(--dim); margin: 10px 0 4px; }
.thread .you span { color: var(--ink); font-weight: 600; background: hsla(210, 40%, 22%, 0.9); border-radius: 999px; padding: 1px 9px; }
.thread .you em { font-style: italic; opacity: .7; }
.thread .turn { margin: 0; }
.thread .by { font-size: 12px; font-weight: 700; margin-bottom: 5px; }
.diff { font-size: 12px; color: var(--dim); }
.diff .plus { color: hsl(140 60% 62%); }
.diff .minus { color: hsl(0 70% 68%); }
.waiting { margin: 10px 0 4px; padding: 6px 10px; border: 1px dashed; border-radius: 8px; font-size: 12px; }
.composer { border: 1px solid var(--line); border-radius: 10px; padding: 8px; margin-top: 10px; background: hsla(210, 40%, 10%, 0.9); }
.composer textarea { width: 100%; box-sizing: border-box; min-height: 52px; resize: none; background: transparent; border: 0; color: var(--ink); font: inherit; font-size: 13px; }
.composer-row { display: flex; gap: 6px; align-items: center; }
.composer-row .grow { flex: 1; }
.composer-row button { background: hsla(190,90%,55%,.25); border: 1px solid var(--line); color: inherit; border-radius: 6px; padding: 3px 12px; font: inherit; font-size: 12px; }
/* TASK-0188 (Edwin: "It should be possible to hide the overview panels"): ◫ Overview hides them at any width, remembered in this browser; the Agents list moves up into their place. */
#overview-seg { display: inline-flex; }
body.hide-overview #overview { display: none; }
body.hide-overview #agents { top: var(--top, 60px); max-height: 300px; }
@media (max-width: 1280px) {
  #drawer { left: 16px; right: 16px; bottom: 34px; }
  #overview { display: none; z-index: 4; }
  body.show-overview #overview { display: block; }
  #agents { top: var(--top, 60px); max-height: 220px; }
  /* Review round two of TASK-0178: the session pane leaves the Agents list in view; the drawer gives way to a wide pane and, open, hides Next up; the overview, when shown, takes the Agents list's place. */
  #panel.wide { width: min(640px, calc(100vw - 420px)); }
  #panel:not([hidden]) ~ #drawer { right: 396px; }
  #panel.wide:not([hidden]) ~ #drawer { display: none; }
  body:has(#drawer.open):not(:has(#panel.wide:not([hidden]))) #queue { visibility: hidden; }
  body.show-overview #agents { display: none; }
}
`;

const html = `<div class="seg" id="overview-seg"><button id="overview-toggle" aria-pressed="true" title="Hide the overview panels">◫ Overview</button></div>
<section id="overview" aria-label="The project at a glance"></section>
<section id="agents" aria-label="Agent sessions"></section>
<section id="drawer" aria-label="Shells"></section>
<div id="newsession" hidden role="dialog" aria-label="New session"></div>
`;

const towersData = writeTowersPage({
  choices,
  fixtureDir: fixtures,
  pagePath,
  extra: {
    title: 'DES-0006 Agent sessions',
    heading: 'DES-0006 · agent sessions',
    help: 'Press an agent to open its session · press a ticket, then ▶ Work on this · ⌘ Shells opens the drawer · drag to turn, scroll to zoom · Escape steps back. Drawn from the sessions the cockpit recorded, as counts: no prompt, reply or command text. Generated by desktop/scripts/agents-page.mjs; do not edit by hand.',
    css,
    html: html + '<div class="seg" id="marks-seg"><button id="marks-toggle" title="What the marks mean">? Marks</button></div>\n',
    script: fs.readFileSync(path.join(here, 'agents-page.js'), 'utf-8'),
    // Each session with the ticket it was started on, where it stands (TASK-0188).
    data: (ws) => {
      const agents = JSON.parse(fs.readFileSync(path.join(fixtures, `${ws}-sessions.json`), 'utf-8'));
      return { agents: { ...agents, sessions: agents.sessions.map((s) => ({ ...s, start: startOf(s) })) } };
    },
  },
});
console.log(`wrote the agent sessions page ${path.relative(process.cwd(), pagePath)} (${Object.entries(towersData).map(([k, w]) => `${k}: ${w.agents.sessions.length} sessions, ${w.agents.requests.length} requests`).join('; ')})`);
