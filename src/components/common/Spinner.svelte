<script lang="ts">
  interface Props {
    size?: number;
    label?: string;
  }

  let { size = 14, label }: Props = $props();
</script>

<span
  class="spinner"
  style:width={`${size}px`}
  style:height={`${size}px`}
  role={label ? 'status' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
></span>

<style>
  .spinner {
    display: inline-block;
    flex: none;
    border: 1.5px solid currentColor;
    border-top-color: transparent;
    border-radius: var(--radius-pill);
    opacity: 0.85;
    animation: spin 700ms linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 150ms;
    }
  }
</style>
