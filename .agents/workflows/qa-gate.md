# /qa-gate

Run this at the end of every block. Report results. Do not fix anything during this workflow.

1. Read the current block in `TASKS.md` and its PASS line.
2. Check the PASS line against the **running app** (local, or the live URL from Block 4 on), not the source code.
3. Run every test in PRD Gate G3 that applies to what exists so far:
   - Blank state (new incognito window)
   - Demo state ("Try the demo shelf")
   - Real state (add 2, refresh, back up, clear, restore)
   - Model forced to fail (from Block 3)
   - Injection label (from Block 3)
   - Not skincare (from Block 3)
   - Bad restore file (from Block 2)
   - Dark mode
4. Scan the diff for: `innerHTML`, `eval(`, API keys, em dashes, ALL CAPS copy, italics, copy not found in `VOICE.md`, new dependencies.
5. Report in this shape:

```
Block: <n>
PASS or FAIL: <one word>, with the evidence
Tests run: <list with PASS/FAIL each>
Diff scan: <findings, or clean>
Anything from a spike still in here? <yes/no, what>
Does this move toward the done line? <yes/no, why>
Suggested FINDINGS.md entry: <one paragraph>
```

6. Stop. Wait for my decision.
