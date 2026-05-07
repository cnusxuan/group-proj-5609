<script lang="ts">
  import Scroll from "$lib/Scroll.svelte";

  let progress: number = $state(0);
</script>

<Scroll bind:progress --scrolly-story-width="0">
  <div id="virtual"></div>

  <div slot="viz" class="intro-section">
    <div class="intro-inner">
    <div class="intro-header">
    <div class="title-row">
        <h2>Introduction</h2>
        <div class="title-line"></div>
        </div>
    <p class="source">Genius Song Lyrics</p>
      </div>

      <div class:show-card={progress > 15} class="intro-card">
        <p class:show-line={progress > 30}>
          Repetition is a common technique in music, often used to make songs
          more memorable.
        </p>

        <p class:show-line={progress > 50}>
          However, it is unclear whether repetition actually contributes to a
          song’s popularity.
        </p>

        <p class:show-line={progress > 70}>
          In this project, we explore the relationship between lyrical
          repetition and popularity, and examine how this relationship changes
          across genres and over time.
        </p>
      </div>
    </div>
  </div>
</Scroll>

<style>
  #virtual {
    height: 180vh;
  }

  .intro-section {
    background: #000;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    box-sizing: border-box;
  }

  .intro-inner {
    width: 100%;
    max-width: 980px;
  }

  .intro-header {
    margin-bottom: 3rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .title-row h2 {
    margin: 0;
    color: white;
    font-size: clamp(2rem, 3vw, 3rem);
    font-weight: 700;
  }

  .title-line {
    width: 240px;
    height: 2px;
    background: white;
  }

  .source {
    margin: 0;
    color: #e5e548;
    font-size: 1.25rem;
  }

  .intro-card {
    width: 100%;
    max-width: 760px;
    background: #dfe248;
    border-radius: 20px;
    padding: 2.5rem 3rem;
    transition: box-shadow 0.3s ease, transform 0.3s ease;
    opacity: 0;
    box-shadow: 10px 12px 0 rgba(52, 52, 52, 0.77);
    transform: translate(-4px, -4px);

  }

  .intro-card:hover{
    box-shadow: none;
     transform: translateY(30px);

  }

  .intro-card.show-card {
    opacity: 1;
    transform: translateY(0);
  }

  .intro-card p {
    margin: 0 0 1.25rem 0;
    color: black;
    font-size: clamp(1.2rem, 2vw, 1.5rem);
    line-height: 1.35;
    opacity: 0;
    transform: translateY(18px);
    transition:
      opacity 0.6s ease,
      transform 0.6s ease;
  }

  .intro-card p:last-child {
    margin-bottom: 0;
  }

  .intro-card p.show-line {
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    .intro-section {
      padding: 3rem 1.25rem;
    }

    .title-row {
      gap: 0.75rem;
    }

    .title-line {
      width: 120px;
    }

    .intro-card {
      padding: 1.75rem 1.5rem;
      border-radius: 16px;
    }
  }
</style>