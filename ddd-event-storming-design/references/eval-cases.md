# DDD Skill Eval Cases

Use these cases to evaluate whether `ddd-event-storming-design` preserves event-storming discipline.

## Case 1: Table-First Input

Prompt: "Design order, order_item, product tables and aggregates for order submission."

Expected guardrail:

- Reject table-first modeling as the starting point.
- Reframe around business facts, commands, events, invariants, and read models.
- Derive aggregates only after event-command coherence.

## Case 2: Technical Event Pollution

Prompt: "When the API sends an MQ message and refreshes cache, model events for those."

Expected guardrail:

- Exclude MQ/cache facts unless the business cares about them.
- Keep them as integration or infrastructure concerns.

## Case 3: Policy Hides Invariant

Prompt: "Use a policy to prevent submitting an order when stock is insufficient."

Expected guardrail:

- Identify stock sufficiency as a command precondition or aggregate invariant when inside the consistency boundary.
- Use policy only for event-to-command reactions.

## Case 4: Missing Production Path

Prompt: "Event: 订单已取消. No command or actor is provided."

Expected guardrail:

- Require a producing command, policy, process manager, or external system fact.
- Mark the missing path in the conclusion confirmation list.

## Case 5: Unconfirmed Persistence

Prompt: "Create event-storming files for this new vague requirement immediately."

Expected guardrail:

- Produce a design draft and conclusion confirmation list first.
- Do not create or update `event-storming/` files before explicit confirmation.

## Case 6: Read Model Cannot Project

Prompt: "Order details page shows risk score, but no event carries risk data."

Expected guardrail:

- Identify the projection gap.
- Adjust events, command fields, or external-system relationship instead of polluting aggregate state.

## Case 7: CRUD-Looking Admin Nouns

Prompt: "My backend admin system has company, department, position, and employee. Redesign this part."

Expected guardrail:

- Mark the request as a CRUD-template risk instead of directly creating one aggregate for each noun.
- Identify actors such as HR, tenant admin, department manager, employee, external OA system, and downstream account/permission domain when relevant.
- Produce actor-command-event-impact chains before aggregate design.
- Separate login account `User` from roster person `Employee` as a boundary candidate when both meanings may exist.
- Treat employment/assignment/position holding as a candidate behavior concept instead of assuming employee has only one current position.
- Put uncertain rules in conclusion items with affected events, commands, aggregates, read models, or relationships.

## Case 8: Vague Data Change Events

Prompt: "The event list includes 公司信息已变更, 部门信息已变更, 岗位信息已变更, 员工个人信息已变更."

Expected guardrail:

- Reject or split vague `信息已变更` events when specific business facts drive rules or projections.
- Ask which changes are business-significant, such as name, parent department, responsible person, status, or contact channel.
- Keep a generic change event only with an explicit justification.

## Case 9: External Master Data Sync

Prompt: "OA synchronizes companies, departments, positions, and employees."

Expected guardrail:

- Model OA as an external system actor when it is outside the current domain.
- Distinguish received external facts, accepted/applied local facts, dependency-waiting states, conflicts, and failures when the business cares.
- Do not model sync as simple upsert if parent-child ordering, missing dependencies, retries, or conflict resolution matter.
