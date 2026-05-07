<script lang="ts">
  import Scroll from "$lib/Scroll.svelte";

  let progress: number = $state(0);
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,700;1,800&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<Scroll bind:progress --scrolly-story-width="0">
  <div id="virtual"></div>

  <div slot="viz" class="end-section">
    <div class="end-inner">
      <p class:show={progress > 12} class="line-fade">
        From three songs to thirteen thousand.
      </p>

      <p class:show={progress > 28} class="line-fade">
        From one chorus to fifty years.
      </p>

      <p class:show={progress > 48} class="line-fade line-emphasis">
        Some songs barely repeat.<br/>
        Some repeat almost everything.
      </p>

      <p class:show={progress > 65} class="line-fade line-emphasis">
        Repetition is a choice.<br/>
        And every great song makes its own.
      </p>

      <p class:show={progress > 82} class="line-finale">
        Now listen again.
      </p>
    </div>
  </div>
</Scroll>

<style>
  #virtual {
    height: 240vh;
  }

  .end-section {
    background: #000;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6rem 2rem;
    box-sizing: border-box;
  }

  .end-inner {
    width: 100%;
    max-width: 1000px;
    text-align: center;
    color: white;
    font-family: "Playfair Display", serif;
  }

  .line-fade {
    margin: 3rem 0;
    font-size: clamp(1.5rem, 2.4vw, 2.2rem);
    font-style: italic;
    font-weight: 400;
    color: #ccc;
    line-height: 1.5;
    letter-spacing: 0.01em;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.9s ease, transform 0.9s ease;
  }

  .line-emphasis {
    color: #eee;
    font-weight: 400;
    line-height: 1.6;
  }

  .line-finale {
    margin: 6rem 0 2rem 0;
    font-size: clamp(3rem, 6vw, 5rem);
    font-style: italic;
    font-weight: 800;
    color: white;
    line-height: 1.1;
    letter-spacing: -0.01em;
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 1.2s ease, transform 1.2s ease;
  }

  .line-fade.show,
  .line-finale.show {
    opacity: 1;
    transform: translateY(0);
  }
</style>
