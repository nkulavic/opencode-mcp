# Skill Evaluation Benchmark — Iteration 1

## Summary

| Config | Pass Rate | Assertions Passed | Mean Tokens | Mean Duration |
|--------|-----------|-------------------|-------------|---------------|
| **With Skill** | **100%** | **27/27** | 15,732 | 96.3s |
| Without Skill | 56% | 13/27 | 14,899 | 76.6s |
| **Delta** | **+44%** | **+14** | +833 (5.6%) | +19.7s (25.7%) |

## Per-Eval Breakdown

### Eval 1: File Upload Endpoint (opencode skill)
| Config | Pass Rate | Key Difference |
|--------|-----------|----------------|
| With Skill | 5/5 (100%) | Explicitly checks path traversal, file type bypass |
| Without Skill | 4/5 (80%) | Misses security-specific review concerns |

### Eval 2: Button Color Change (opencode skill)
| Config | Pass Rate | Key Difference |
|--------|-----------|----------------|
| With Skill | 4/4 (100%) | Quotes skill guidance for why not to delegate |
| Without Skill | 4/4 (100%) | Independently makes same decision |
**Non-discriminating** — both configurations produce identical behavior.

### Eval 3: Weather Dashboard (opencode-build skill)
| Config | Pass Rate | Key Difference |
|--------|-----------|----------------|
| With Skill | 7/7 (100%) | Full SPEC→DRAFT→REVIEW→POLISH pipeline, 13-point bug checklist |
| Without Skill | 0/7 (0%) | Writes directly — no spec, no delegation, no structured review |
**Maximum differentiation** — the skill completely transforms the workflow.

### Eval 4: Markdown Editor (opencode-build skill)
| Config | Pass Rate | Key Difference |
|--------|-----------|----------------|
| With Skill | 6/6 (100%) | Detailed spec, Cerebras draft, 11 review categories, structured polish |
| Without Skill | 0/6 (0%) | Writes directly — no pipeline, minimal review |
**Maximum differentiation** — same pattern as eval 3.

### Eval 5: Auth Middleware Tests (opencode skill)
| Config | Pass Rate | Key Difference |
|--------|-----------|----------------|
| With Skill | 5/5 (100%) | Identifies tests as "perfect delegation target" per skill guidance |
| Without Skill | 5/5 (100%) | Independently decides to delegate — same quality |
**Non-discriminating** — both configurations produce equivalent behavior.

## Analysis

### Where the skills add the most value
1. **opencode-build**: Massive impact on build tasks. Without the skill, Claude writes everything directly (slower, less structured). With the skill, it follows the 4-phase pipeline: write a spec, generate in ~2s via Cerebras, review with a thorough bug checklist, then polish. This is the core value proposition.

2. **opencode (security review)**: The skill's review checklist adds depth. Eval 1 shows the with-skill version explicitly checking for path traversal and file type validation bypass — security concerns the baseline misses.

### Where the skills don't differentiate
1. **Tiny edits** (eval 2): Both with and without skill correctly avoid delegation. The skill confirms this behavior but doesn't change it.

2. **Test writing** (eval 5): Both configurations independently decide to delegate test writing to OpenCode. The skill provides structure but Claude already makes good delegation decisions for this task type.

### Cost
The with-skill runs use ~5.6% more tokens and take ~25.7% longer on average. The extra time comes primarily from the opencode-build evals where the structured pipeline produces much more detailed output (specs, review checklists, delivery reports).

### Recommendation
Both skills are effective. The opencode-build skill is the standout — it provides a completely different (and better) workflow for build tasks. The opencode skill provides incremental value through security review guidance. No changes needed for iteration 1.
