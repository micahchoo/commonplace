<script>
  // are.na-hosted (framing-safe). PDF inlines on desktop; iOS Safari can't scroll an
  // iframed PDF, so mobile degrades to a download card. video/audio render natively.
  import FallbackCard from './FallbackCard.svelte';
  let { block } = $props();

  const a = $derived(block.attachment || {});
  const type = $derived(a.contentType || '');
  const isPdf = $derived(type === 'application/pdf');
  const isVideo = $derived(type.startsWith('video/'));
  const isAudio = $derived(type.startsWith('audio/'));

  let isMobile = $state(false);
  $effect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    isMobile = mq.matches;
    const on = () => (isMobile = mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });
</script>

{#if isPdf && !isMobile}
  <!-- not sandboxed: Chrome's PDF viewer blanks under sandbox; source is trusted are.na -->
  <iframe class="at-attachment" title={block.title} src={a.url}></iframe>
{:else if isVideo}
  <!-- svelte-ignore a11y_media_has_caption -->
  <video class="at-attachment" controls src={a.url}></video>
{:else if isAudio}
  <audio controls src={a.url}></audio>
{:else}
  <FallbackCard {block} />
{/if}

<style>
  .at-attachment {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }
  video.at-attachment {
    object-fit: contain;
    background: #000;
  }
</style>
