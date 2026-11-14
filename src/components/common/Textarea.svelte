<script module lang="ts">
  let seq = 0;
</script>

<script lang="ts">
  interface Props {
    value?: string;
    label?: string;
    placeholder?: string;
    help?: string;
    error?: string;
    disabled?: boolean;
    rows?: number;
    mono?: boolean;
    id?: string;
    oninput?: (event: Event) => void;
    onblur?: (event: FocusEvent) => void;
  }

  let {
    value = $bindable(''),
    label,
    placeholder,
    help,
    error,
    disabled = false,
    rows = 8,
    mono = false,
    id,
    oninput,
    onblur,
  }: Props = $props();

  const generated = `graft-textarea-${seq++}`;
  let inputId = $derived(id ?? generated);
  let msgId = $derived(`${inputId}-msg`);
</script>

<div class="field">
  {#if label}<label for={inputId}>{label}</label>{/if}
  <textarea
    id={inputId}
    bind:value
    {placeholder}
    {disabled}
    {rows}
    class:mono
    class:invalid={!!error}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error || help ? msgId : undefined}
    {oninput}
    {onblur}
  ></textarea>
  <p class="msg" class:error={!!error} id={msgId}>{error ?? help ?? ''}</p>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }
  label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-ink);
  }
  textarea {
    width: 100%;
    padding: var(--spacing-xs) 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    background: var(--color-paper);
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    resize: vertical;
  }
  textarea.mono {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  textarea:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }
  textarea.invalid {
    border-color: var(--color-error);
  }
  textarea:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .msg {
    min-height: 1lh;
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .msg.error {
    color: var(--color-error);
  }
</style>
