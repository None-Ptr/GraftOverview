import type { GoalSpec, Locale } from '$lib/types';
import type { SerializedTrees } from './serialize';

/** §4.3 — exact system prompt. zh/en locale decides the output language. */
export const GENERATION_SYSTEM = `你是课程设计师。根据用户给出的学习目标，生成一份层级化目标知识体系。

规则：
1. 输出 3–4 层，60–140 个节点；根节点是领域名。
2. 覆盖基础、核心、进阶；不要平均分配，按重要性决定分支大小。
3. 每个节点 1 个 topic（不超过 40 字）和 1 个 note（20–40 字，说明「学到什么程度」）。
4. 不要输出 ID；不要输出 Markdown；不要输出 URL。
5. 只输出 JSON，不要代码块，不要解释。
6. 输出语言与用户 locale 一致（zh → 简体中文，en → English）。`;

export function generationUserPrompt(goal: GoalSpec): string {
  const lines = [
    'domain: ' + goal.domain,
    'goal: ' + goal.goal,
    'level: ' + goal.level,
  ];
  if (goal.horizon) lines.push('horizon: ' + goal.horizon);
  if (goal.weeklyHours !== undefined) lines.push('weeklyHours: ' + goal.weeklyHours);
  lines.push('locale: ' + goal.locale);
  return `<GOAL>\n${lines.join('\n')}\n</GOAL>`;
}

/** §4.4 — exact system prompt. */
export const COMPARISON_SYSTEM = `你是知识体系评估专家。把「目标知识体系」与「用户当前知识体系」做语义比对，判断哪些目标节点已被掌握、哪些缺失，并给出补全建议。

规则：
1. 只依据提供的节点标题和说明判断，不要臆测用户没写出的能力。
2. 语义等价、同义表述、上下位关系都算已覆盖。例如「闭包」与「closure」，「HTTP 缓存」与「强缓存/协商缓存」。
3. 一个目标节点最多匹配一个用户节点；一个用户节点可以匹配多个目标节点。
4. 只报告每条缺失分支的「最高缺失节点」，不要同时报告它的后代；客户端会自动补全整棵子树。
5. suggestedUserParentId 必须是用户树中语义最近的祖先节点 ID；没有合适父节点用 null（挂到用户根下）。
6. 不要建议目标体系中不存在的节点。
7. reason 用 1–2 句说明「为什么这是缺口」和「补上后能做什么」，不超过 300 字。
8. selfCheck 给 1–3 个可以被「会/不会」回答的自测问题。
9. links 最多 2 条，只给官方文档或公认经典资源；不确定 URL 就不要给；不要编造链接。
10. priority 只能是 high / medium / low；核心路径缺失用 high，加分项用 low。
11. extras 只列用户树中明显超出目标范围的节点，最多 20 条；不要罗列每个叶子。
12. 输出语言与 UI locale 一致。
13. 只输出 JSON，不要 Markdown 代码块，不要解释。`;

export function comparisonUserPrompt(trees: SerializedTrees, locale: Locale): string {
  return `<UI_LOCALE>${locale}</UI_LOCALE>

<TARGET>
${trees.targetText}
</TARGET>

<USER>
${trees.userText}
</USER>`;
}

/** One-shot repair: never allow the model to add nodes (§4.5). */
export function repairJsonPrompt(raw: string, reason: string): string {
  const truncated = raw.slice(0, 2000);
  return `上一次输出不是有效的 JSON，或引用了不存在的节点 ID。错误信息：${reason.slice(0, 300)}

请只返回修正后的 JSON，严格使用原始输出里出现过的 t*/u* ID，不要新增或删除节点，不要输出代码块，不要解释。

<RAW>
${truncated}
</RAW>`;
}
