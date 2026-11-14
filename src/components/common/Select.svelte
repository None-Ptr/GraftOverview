<script module lang="ts">
  interface SelectOption {
    value: string;
    label: string;
  }
  let seq = 0;
</script>

<script lang="ts">
  interface Props {
    value?: string;
    options: SelectOption[];
    label?: string;
    help?: string;
    error?: string;
    disabled?: boolean;
    id?: string;
    onchange?: (event: Event) => void;
  }

  let {
    value = $bindable(''),
    options,
    label,
    help,
    error,
    disabled = false,
    id,
    onchange,
  }: Props = $props();

  const generated = `graft-select-${seq++}`;
  let inputId = $derived(id ?? generated);
  let msgId = $derived(`${inputId}-msg`);
</script>

<div class="field">
  {#if label}<label for={inputId}>{label}</label>{/if}
  <select
    id={inputId}
    bind:value
    {disabled}
    class:invalid={!!error}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error || help ? msgId : undefined}
    {onchange}
  >
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
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
  select {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    background: var(--color-paper);
    color: var(--color-ink-2);
    font-size: var(--text-sm);
  }
  select:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }
  select.invalid {
    border-color: var(--color-error);
  }
  select:disabled {
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
  @media (pointer: coarse) {
    select {
      height: 44px;
    }
  }
</style>
