<script module lang="ts">
  let seq = 0;
</script>

<script lang="ts">
  interface Props {
    value?: string;
    type?: 'text' | 'password' | 'number' | 'url' | 'email';
    label?: string;
    placeholder?: string;
    help?: string;
    error?: string;
    disabled?: boolean;
    min?: number;
    max?: number;
    step?: number;
    id?: string;
    oninput?: (event: Event) => void;
    onchange?: (event: Event) => void;
    onblur?: (event: FocusEvent) => void;
  }

  let {
    value = $bindable(''),
    type = 'text',
    label,
    placeholder,
    help,
    error,
    disabled = false,
    min,
    max,
    step,
    id,
    oninput,
    onchange,
    onblur,
  }: Props = $props();

  const generated = `graft-input-${seq++}`;
  let inputId = $derived(id ?? generated);
  let msgId = $derived(`${inputId}-msg`);
</script>

<div class="field">
  {#if label}<label for={inputId}>{label}</label>{/if}
  <input
    id={inputId}
    {type}
    bind:value
    {placeholder}
    {disabled}
    {min}
    {max}
    {step}
    class:invalid={!!error}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error || help ? msgId : undefined}
    {oninput}
    {onchange}
    {onblur}
  />
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
  input {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    background: var(--color-paper);
    color: var(--color-ink-2);
    font-size: var(--text-sm);
  }
  input:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }
  input.invalid {
    border-color: var(--color-error);
  }
  input:disabled {
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
    input {
      height: 44px;
    }
  }
</style>
