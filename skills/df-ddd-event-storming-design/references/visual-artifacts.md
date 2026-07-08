# DDD Visual Artifacts

Visual artifacts are review aids. They help humans inspect a confirmed model, but they must not replace event-storming text as the canonical design unless the project explicitly chooses that.

## Source-Of-Truth Rule

- Keep the confirmed Markdown event-storming artifacts as the source of truth by default.
- Generate diagrams only from confirmed commands, events, aggregates, policies, read models, and field-source decisions.
- If a diagram reveals a missing domain concept, return to the textual model first and mark the item as a candidate until it passes the normal event, command, aggregate, or read-model gate.
- Do not let a diagramming tool create domain events for display completeness, layout symmetry, or generated-code convenience.

## Recommended Artifacts

Use these recurring visual forms when they clarify the review:

- Aggregate command/fact flow: `Actor -> Command -> Aggregate -> Event -> Business consumer or read model`.
- Upstream fact acceptance flow: `External system -> Apply upstream fact command -> Aggregate -> Accepted event(s) or command result/log-only rejection`.
- CQRS projection flow: `Accepted events -> Projector or projection step -> Read model fields -> Query consumers`.
- Candidate-event screening view: `Candidate event -> accepted / rejected / downgraded / unresolved reason`.

Do not mix every view into one large diagram. Prefer a small diagram per aggregate or per read-model family.

## Labeling Rules

- Use the project's domain language in labels.
- Avoid implementation names such as class names, table names, DTO names, handler names, package names, repository names, or framework names.
- Mark nodes by role when the format supports it: Actor, System, Command, Aggregate, Event, Policy, Service, Read Model, Candidate, Rejected.
- Keep read-model projection labels distinct from domain-event labels.
- If a rejected candidate appears in a diagram, show why it was rejected, such as "read-model only", "log only", "no business consumer", or "outside this problem domain".

## Placement

When persisting visual files, place them near the event-storming model, for example:

```text
event-storming/
  visuals/
    <aggregate-or-read-model>-flow.svg
    <aggregate-or-read-model>-flow.md
  domain-designer/
    README.md
    <source>.ts
```

Use whichever folder pattern already exists in the repository. If the repository already keeps SVGs directly under `event-storming/`, continue that style and add a short README when a visualization workspace is introduced.

Generated caches and build outputs such as `.output/`, browser build folders, screenshots, or package-manager caches should not become design artifacts unless the user explicitly asks to preserve them.

## `domain-designer-cli-node` Adapter

`domain-designer-cli-node` is a useful optional adapter when the user wants a navigable review surface with actor, command, aggregate, event, policy, system, read-model, workflow, and user-story views.

Use it when:

- the textual DDD design is already confirmed enough to visualize
- multiple workflows or read-model projection paths are easier to review interactively
- the project accepts a small TypeScript workspace as a visual design artifact

Do not use it to:

- decide which events are real
- justify aggregate state fields
- replace candidate-event screening
- generate production code before a separate implementation or TDD handoff exists
- encode private project details in a shared skill, template, issue, or PR

Every persistent `domain-designer-cli-node` workspace should include a README that states:

- the canonical source of truth
- the intended review use
- the command used to open the visualizer
- whether generated code is intentionally out of scope

## Review Gate

Before handing off a visual artifact, check:

- Each command has an actor or external system.
- Each accepted event has a production path.
- Each aggregate node has textual aggregate evidence.
- Each aggregate state field shown in notes is justified by a business method, invariant, event decision, or lifecycle transition.
- Each read-model field has a source: accepted event, enriched payload, projection input, query-side join, current-state lookup, external read source, or explicit unresolved gap.
- No visual-only item is presented as confirmed domain design.
