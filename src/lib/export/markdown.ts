import type { ComparisonResult, HistoryEntry, Workspace } from '$lib/types';
import { t } from '$lib/i18n';

export function timestampStamp(date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`;
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderReport(
  mapTitle: string,
  comparison: ComparisonResult | null,
  targetTitle?: string,
): string {
  const lines: string[] = [`# ${mapTitle}`, ''];
  if (!comparison) {
    lines.push(`> ${t('history.emptyBody')}`);
    return lines.join('\n');
  }

  const stats = comparison.stats;
  const percent = Math.round(stats.coverage * 100);
  lines.push(
    `> ${t('suggest.coverageMeta', {
      target: stats.targetNodes,
      covered: stats.matchedNodes,
      missing: stats.gapNodes,
    })} · ${percent}%`,
  );
  lines.push('');
  lines.push(`## ${t('suggest.tab')}`);
  lines.push('');

  const order = { high: 0, medium: 1, low: 2 } as const;
  const gaps = [...comparison.gaps].sort((a, b) => order[a.priority] - order[b.priority]);
  for (const gap of gaps) {
    lines.push(
      `### [${t(`suggest.priority.${gap.priority}`)}] ${gap.topic} — ${t('suggest.nodeCount', {
        count: gap.nodeCount,
      })}`,
    );
    lines.push('');
    lines.push(`- ${t('suggest.reason')}: ${gap.reason}`);
    lines.push(`- ${t('suggest.selfCheck')}: ${gap.selfCheck.join(' / ')}`);
    if (gap.links.length > 0) {
      lines.push(
        `- ${t('suggest.links')}: ${gap.links
          .map((link) => `[${link.title}](${link.url})`)
          .join(' · ')} (${t('suggest.unverifiedLinks')})`,
      );
    }
    lines.push(`- ${t('suggest.statusLabel')}: ${t(`suggest.status.${gap.status}`)}`);
    lines.push('');
  }

  if (comparison.extras.length > 0) {
    lines.push(`## ${t('suggest.extras')}`);
    lines.push('');
    for (const extra of comparison.extras) lines.push(`- ${extra.reason}`);
    lines.push('');
  }

  lines.push('---');
  lines.push(`${t('common.appName')} · ${t('common.tagline')}${targetTitle ? ` · ${targetTitle}` : ''}`);
  return lines.join('\n');
}

export function buildMarkdownReport(workspace: Workspace): string {
  return renderReport(workspace.map.title, workspace.comparison, workspace.target?.title);
}

export function buildHistoryReport(entry: HistoryEntry): string {
  return renderReport(entry.mapTitle, entry.result, entry.targetTitle);
}
