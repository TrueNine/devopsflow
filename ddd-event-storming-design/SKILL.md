---
name: ddd-event-storming-design
description: 使用事件风暴和 CQRS 思想进行纯 DDD 领域建模。Use this skill when Codex needs to analyze business requirements, evolve a persistent domain model, identify actors and multi-role collaboration, domain events, commands, policies, aggregates, domain services, read models, produce structured Markdown or optional Mermaid/PlantUML diagrams, and review designs that may be CRUD, database, package-structure, or DDD-terminology driven instead of problem-domain driven. Especially use for CRUD-looking admin requirements such as company, department, position, employee, account, role, or permission management that need behavior-first modeling instead of flat noun aggregates.
---

# DDD Event Storming Design

## Core Rule

Use event storming as the entry point for DDD modeling.

Start from the current problem domain, business facts, domain events, commands, rules, state changes, and read models. Derive aggregates afterward.

Do not start from database tables, CRUD pages, HTTP APIs, package structure, entities, aggregate roots, repositories, or tactical DDD terminology.

Always identify the business actors, external systems, timers, and affected subjects before finalizing commands and events. Commands are issued by an actor; events change something that matters to one or more actors or read models.

Unless the user explicitly asks for implementation, produce only domain design artifacts. Do not generate code, tests, framework structure, persistence mapping, or TDD plans.

## Operating Mode

Prefer persistent domain modeling when the user is evolving the same business domain.

Use a two-stage workflow for requirements-driven modeling:

1. Design draft: analyze the request, read relevant existing model files if any, infer a complete candidate domain model from the available facts, and present the design conclusions in chat.
2. Conclusion confirmation and persistence: ask the user to confirm or correct the design conclusions one by one. Create or update `event-storming/` files only after the user explicitly confirms the candidate model or a specific set of changes.

Do not create or update persistent model files from a new or changed requirement before confirmation. User requirements are often incomplete, and the requester may not know which missing facts matter for DDD modeling.

Do not interrupt the initial design draft with clarification questions unless the requirement is too incomplete to produce any meaningful DDD draft. If information is missing, make the smallest reasonable assumption, mark it as an inferred conclusion, and include it in the confirmation list.

Exception: when the request is only a CRUD-like noun list (for example "company, department, position, employee" or "user, role, menu, permission"), do not invent a complete flat management model. First mark the request as a CRUD-template risk, then produce a behavior-first draft around likely actors, collaboration scenarios, lifecycle decisions, and disputed boundaries. Keep assumptions explicit and ask the user to confirm the role/behavior conclusions before persisting files.

If the workspace contains an `event-storming/` model repository, read the relevant files first, but treat this as read-only input until confirmation is received.

If it does not exist:

- If the user wants files, first present the smallest useful candidate model repository contents and conclusion confirmation list.
- If the user only wants discussion, output the same structure in chat without creating files.

Do not require the user to provide complete requirements upfront. Accept small increments, design from what is available, and expose assumptions, alternatives, and missing business facts as conclusions to confirm before persisting them.

## Model Repository

Use this structure when persisting the model:

```text
event-storming/
  README.md
  actors.md
  domain-boundary.md
  glossary.md
  events.md
  commands.md
  policies.md
  read-models.md
  relationships.md
  completeness-check.md
  aggregates/
    <aggregate-name>.md
```

File responsibilities:

- `README.md`: entry index only; current model status and file navigation.
- `actors.md`: business actors, affected subjects, external systems, timers, and which commands/events they initiate or care about.
- `domain-boundary.md`: current problem domain, included responsibilities, excluded facts, assumptions, evolution notes.
- `glossary.md`: ubiquitous language and business terms.
- `events.md`: global domain event index.
- `commands.md`: global command index.
- `policies.md`: event-to-command automation rules and process manager candidates.
- `read-models.md`: query needs, read model fields, projection events.
- `relationships.md`: global dependency and subscription relationships.
- `completeness-check.md`: completeness and design-quality checks.
- `aggregates/<aggregate-name>.md`: commands, events, state, rules, and local relationships of one aggregate.

## Incremental Update Rules

For each user request:

1. Classify the request as new capability, changed capability, expanded problem domain, or design review.
2. Read only relevant model files before deriving the draft.
3. Produce a complete candidate design that shows proposed changes to affected indexes and aggregate files together.
4. Call out assumptions, ambiguous terms, alternative interpretations, and missing business rules as inferred design conclusions, not as pre-design questions.
5. Ask the user to confirm or correct the design conclusions one by one before writing files.
6. After confirmation, update affected indexes and aggregate files together.
7. Preserve semantic evolution notes when renaming, splitting, merging, or moving concepts.
8. If a new requirement exposes an incomplete old model, fix the model instead of hiding the gap behind a Policy, service, or handler.
9. End with a short summary of changed files, changed domain concepts, and remaining questions.

Do not regenerate the whole model unless the user asks or the existing model is too inconsistent to update safely.

## Modeling Principles

- Model the current problem domain. Do not pre-split bounded contexts.
- Treat actors as first-class modeling input. Distinguish command initiators, affected subjects, approvers, auditors, downstream consumers, timers, and external systems.
- Mark an external system only when a capability is clearly outside the current system/problem domain.
- Use business language that domain experts can understand.
- Model behavior before structure.
- For admin-system requirements, treat "management" pages as a discovery clue, not as the domain model. Reframe noun lists into lifecycle events, assignments, approvals, ownership changes, synchronization facts, and cross-role consequences.
- Treat CQRS as a modeling perspective: commands change business state through the domain model; queries are satisfied by read models.
- Read models must be derivable from domain events.
- Iterate when commands, events, aggregates, or read models do not explain each other.

## Workflow

### 1. Define Scope

Restate the current problem or increment.

Record:

- included business responsibilities
- excluded background facts
- actor groups and affected subjects
- assumptions
- ambiguous terms
- alternative interpretations
- blocking unknowns

Do not ask targeted questions before the first draft unless no useful model can be produced. Prefer to design first, mark uncertain points as inferred conclusions, and ask for confirmation after the design conclusions are visible.

### 1.5 Identify Actors And Collaboration

Before listing events, identify:

- command initiators: people, roles, timers, or external systems that can request a state change
- affected subjects: people, organizations, assets, or records whose business state changes
- decision makers: roles that approve, reject, transfer, or override
- downstream consumers: roles or systems that rely on the resulting facts or read models
- boundary candidates: concepts with different language or ownership, such as `User` as login account versus `Employee` as roster person

For each major scenario, produce a compact chain:

```text
Actor -> Command -> Event(s) -> Affected subject/read model -> Follow-up policy or open question
```

If different actors can issue similar commands, model the difference when it changes required fields, permission assumptions, events, policies, or audit meaning.

### 2. Identify Domain Events

Extract already-happened business facts as candidate events.

Keep only facts that the current problem domain needs for business rules, state decisions, workflow progress, or read model construction.

Rules:

- Name events in completed business tense, such as `订单已提交`, `书已归还`, `月度考勤已结算`.
- Prefer specific business facts over generic data-change facts. Avoid vague events such as `信息已变更`, `资料已更新`, `状态已修改`, or `记录已删除` unless the exact changed attribute has no business-specific meaning; when using a generic event, explain why it is acceptable.
- Split combined facts such as `已停用或解散` into separate events when different policies, read models, or actor consequences may apply.
- Exclude technical facts such as logs, messages, cache refreshes, interface calls, and notifications unless the business explicitly cares about them.
- Exclude facts outside the current problem domain.
- Model failure events only when the failure itself has business meaning.
- Every current-domain event must have a production path: actor, command, aggregate/process, and meaningful outcome.

### 3. Derive Commands

For each domain event, identify the business command that caused it.

A command is an instruction sent to the domain model to complete a valuable business action.

Rules:

- Name commands as business actions, such as `提交订单`, `签到`, `结算月度考勤`, `归还图书`.
- Include the initiating actor for each command. If the same business action can be initiated by different actors or systems, explain whether it is one command with actor-specific rules or separate commands.
- Avoid CRUD-template names such as `新增`, `修改`, `删除`, `维护`, `管理`, `变更信息`, or `同步数据` when a more precise business intent exists. Use names that reveal why the change matters, such as `任命部门负责人`, `登记员工入职`, `确认OA员工同步结果`, or `撤销岗位任职`.
- Commands are not HTTP APIs, UI actions, controller methods, or use cases.
- One command may produce multiple events.
- Timer-triggered behavior still uses a command; the timer is an Actor.
- Command fields include only information the actor must provide and information the aggregate cannot derive from current state or historical events.
- If command execution needs information that cannot come from command fields or aggregate state/history, the event-command model is incomplete.

### 4. Model Policies And Processes

Use Policy for automatic business reactions.

Policy means: when an event occurs, execute a command.

Rules:

- Use Policy for stateless event-to-command business rules.
- Mark a process manager/SAGA candidate when the reaction needs durable state, waiting, resumption, or coordination across multiple local transactions.
- Do not use Policy to hide aggregate invariants.
- Use a domain service only when behavior cannot naturally belong to one aggregate and is still true domain collaboration or calculation.

### 5. Derive Or Update Aggregates

Derive aggregates after the event-command model is coherent.

An aggregate is defined by a cohesive group of long-lived business capabilities, not by fields or tables.

For each aggregate, specify:

- name and identity
- state needed by its behavior
- actors allowed to issue its commands, when actor-specific rules matter
- commands it handles
- events it publishes
- rules and invariants it protects
- why commands/events belong here

Rules:

- Current-domain state-changing events should normally be published by aggregates.
- A process manager may trigger commands; it should not replace aggregates as the source of core state-change events.
- Aggregate state must be reconstructable from its historical events when using an event-sourcing view.
- If a proposed aggregate name is the same as a noun from the user prompt or a CRUD page, prove it is a consistency/lifecycle boundary. If you cannot prove that, mark it as a candidate read model, reference data, or unresolved concept instead of finalizing it as an aggregate.
- Do not merge aggregates because fields look similar.
- Do not split aggregates so finely that coupling leaks into services or handlers.
- Do not grow aggregates so large that performance, concurrency, or loading boundaries become unreasonable.

### 6. Design Read Models

Separate query needs from command behavior.

For each read model, specify:

- user or query need
- identity
- fields
- events that create or update it
- whether it can be built from domain events

If a read model cannot be built from events, adjust events, command fields, or aggregate behavior. Do not pollute aggregates with report or page fields.

## Relationship Rules

Maintain three relationship views:

- Dependency: a command checks or depends on prior facts, aggregate state, or upstream status.
- Subscription: an event triggers a Policy, which executes a command.
- Actor impact: an event changes what an actor, affected subject, external system, or read model can see or do next.

Use text as the source of truth. Diagrams are auxiliary.

Examples:

```text
依赖：岗位已创建事件 -> 员工入职命令，用于校验岗位存在。
订阅：测试工单已开始事件 -> 测试步骤创建策略 -> 创建测试步骤命令。
影响：员工已离职事件 -> 部门负责人候选人读模型移除该员工，并触发负责人任命有效性复核。
```

## Output Order

When responding in chat or updating model files, use this order:

1. `问题域边界`
2. `主体与协作场景`
3. `领域事件清单`
4. `命令清单`
5. `Policy/流程规则`
6. `聚合设计`
7. `领域服务`
8. `读模型设计`
9. `关系总览`
10. `完备性检查`
11. `结论确认清单`

Only list domain services that are truly needed.

Before persistence, `结论确认清单` must list the design conclusions the user should confirm or correct one by one. Include boundary choices, actors and affected subjects, event names and meanings, command responsibilities, policies, aggregate boundaries, invariants, read models, relationships, assumptions, ambiguous business terms, and alternative interpretations that could change the model.

For each confirmation item, explain which event, command, aggregate, policy, read model, or relationship it affects. After confirmation and persistence, include only remaining unresolved items in the final summary.

## Diagram Rules

Prefer structured Markdown by default.

Use Mermaid or PlantUML only when:

- the user asks for a diagram
- the repository already uses that diagram style
- a diagram significantly improves understanding

If using Mermaid, use these labels:

- `[Actor: 用户]`
- `[Timer: 月末定时器]`
- `[System: 外部系统]`
- `[Command: 签到]`
- `[Event: 员工已签到]`
- `[Policy: 满勤奖励策略]`
- `[Aggregate: 月度考勤]`
- `[Service: 借书服务]`
- `[ReadModel: 考勤记录]`

If an existing PlantUML event-storming style exists, continue it. Prefer one local file per aggregate and a global file for cross-aggregate relationships.

## Completeness Check

Before finalizing, check:

- Every command has an initiating actor or external system.
- Every domain event has a production path from actor -> command -> aggregate/process -> event.
- Every important event has an affected actor, subject, read model, policy, or downstream relationship.
- Current-domain state-changing events are published by aggregates unless a clear exception is recorded.
- Every command has the information it needs from command fields plus aggregate state/history.
- Meaningful command outcomes are represented as events.
- Generic events such as `信息已变更` have been replaced by specific facts or explicitly justified.
- Every read model can be built from domain events.
- Policies do not hide aggregate invariants.
- Domain services do not become procedural service layers.
- Aggregates are derived from behavior, rules, identity, lifecycle, and invariants, not tables, CRUD resources, or noun lists.
- Aggregates are neither too large nor too fragmented.
- Query needs do not pollute aggregate state.

## Reject These Anti-Patterns

Refuse or correct these patterns:

- Starting by creating `application/domain/infrastructure` packages.
- Renaming controller-service-dao into DDD layers.
- Designing aggregates from database tables, CRUD pages, or REST resources.
- Designing one aggregate per noun in a CRUD-looking prompt without proving lifecycle and consistency boundaries.
- Flattening a multi-role workflow into a single administrator actor or a single "manage data" scenario.
- Using vague data-change events such as `信息已变更` when a concrete business fact is available.
- Treating external master-data sync as a simple upsert when ordering, dependency, failure, or conflict resolution has business meaning.
- Creating domain events for technical actions the business does not care about.
- Putting report/page/query fields into aggregates for convenience.
- Putting most business rules into command handlers, application services, listeners, repositories, or policies.
- Splitting bounded contexts before understanding the current problem domain.
- Treating CQRS as database read-write splitting instead of business command/query responsibility separation.

See `references/anti-patterns.md` for a compact anti-pattern library when reviewing designs.

## On-Demand References And Scripts

- `references/anti-patterns.md`: DDD modeling anti-patterns to reject or correct.
- `references/eval-cases.md`: evaluation cases for checking whether the skill preserves event-storming discipline.
- `scripts/validate_ddd_design.py`: lightweight heuristic checks for Markdown drafts or `event-storming/` repositories.
