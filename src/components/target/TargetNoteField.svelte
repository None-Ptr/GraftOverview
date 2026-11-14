<script lang="ts">
  import Textarea from '$lib/components/common/Textarea.svelte';
  import { t } from '$lib/i18n';

  interface Props {
    id: string;
    note: string;
    onsave: (id: string, note: string) => void;
  }

  let { id, note, onsave }: Props = $props();
  // Mounted under {#key nodeId}, so the draft resets when the selection changes.
  // svelte-ignore state_referenced_locally
  let value = $state(note);
</script>

<div class="note-editor">
  <Textarea
    label={t('target.detail.noteLabel')}
    help={t('target.detail.noteHint')}
    rows={3}
    bind:value
    onblur={() => onsave(id, value)}
  />
</div>

<style>
  .note-editor {
    margin-top: var(--spacing-sm);
  }
</style>
