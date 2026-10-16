# Overview fixtures

`deck.json` and `your-trainer.json` are the real index builder's output, including each ticket's cockpit `type`, `fill` and `needsYou` fields. The DES-0004 state remains separate for the wheel's state colouring. `flows/README.md` describes the recorded sidecar evidence for S5 to S7.

Capture from the repository root after `cd desktop && npm run build`:

```sh
node desktop/scripts/overview.mjs . --json > desktop/fixtures/overview/deck.json
node desktop/scripts/overview.mjs ../your-trainer --json > desktop/fixtures/overview/your-trainer.json
```

The 2026-10-15 Deck capture has 384 tickets at `96955cc8afecc56b8ac36d19e55e6b354d71cfd0`, with `dirty: false`. It adds 14 tasks, eight tests and one risk to the previous 361-ticket fixture. Your Trainer has 2,747 tickets at `c38475f8862520eca61d64383ac946163e1d5bd9`, with `dirty: true`: another session still owns uncommitted notes and ledger changes there. Neither its files nor its index were written by this capture.

**2026-10-16 (TASK-0165): each ticket's `feature`, and the model's `focus` and `next`.** Deck's fixture was rebuilt from a clean `git archive` of `65c6397cf5152cc27c745557eced7ddc51cdc449` with its recorded `generated` date; apart from the three new fields it is identical to the previous capture. 219 tickets have a feature; the focus is PHASE-0005, FEAT-0028 and TASK-0154, which is next. Your Trainer's fixture could not be rebuilt, for the reason above, so only the new fields were added to the tickets it already holds: each ticket's `feature` from the builder run over Your Trainer's notes at `e181372c` (whose commits now hold the notes that were uncommitted at capture), kept only where that feature is a ticket of the fixture, and the focus from `c38475f`'s SNAPSHOT (PHASE-025, FEAT-0136, no task; next TASK-1057, the feature's first task at doing). 1,093 tickets have a feature. Both agree with DES-0005's towers page floor for floor.

To reproduce Deck, read that commit into a temporary directory using `git archive`, then run the built builder over its docs with the fixture's `generated` date and snapshot staleness threshold. A later capture date may change stale manual verification, so byte-for-byte comparisons must reuse the recorded date. The command above captures now and records that timestamp. Your Trainer cannot be reconstructed from its commit alone until the other session commits its source changes.

`overview-model.test.mjs` runs live parity against the sibling cockpit's `Index.build` and `stats_payload`, using `.venv/bin/python3` when present and `PYTHONPATH=<cockpit>/src`. It never starts a server. A missing checkout is a loud skip; an installed checkout with missing Python dependencies fails with the import error. The port also applies to risks, decisions and designs, which the stats payload does not enumerate, and to any loose tickets its phase lists omit.
