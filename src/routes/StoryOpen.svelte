<script lang="ts">
  import { Scroll } from "$lib";

  import { slide, fly } from "svelte/transition";

  type Props = {
    movieNum: number;
  };
  let { movieNum }: Props = $props();

  let progress: number = $state(0);
</script>

<Scroll bind:progress --scrolly-story-width="0">
  <div id="virtual"></div>
  <div slot="viz" class="hero">
  <div class="hero-inner">
    <div class="line">    </div>
        <h1>
            How does lyrical repetition relate to song popularity, and does that relationship change by genre and over time?
        </h1>
    

    <div class="slot">
    {#if progress > 30}
      <p
        in:slide={{
          duration: 1000,
          axis: "x",
        }}
      >
            Data from the Genius Song Lyrics dataset on Kaggle, containing song metadata, lyrics, and view counts, with computed repetition scores for analysis.
      </p>
      
    {/if}
    </div>

   <!-- {#if progress > 70}
      <p in:fly={{ duration: 800, x: 0, y: 200 }}>with computed repetition scores for analysis.</p>
    {/if}-->
  </div>
  </div>
</Scroll>

<!-- <svelte:window bind:scrollY={progress} /> -->

<style>
.hero{
        background: black;
        min-height: 78vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem 5rem;
        box-sizing: border-box;
        
    }
    .hero-inner{
        width: 100%;
        max-width: 980px;
    }

    .line{
        width: 200px;
        height: 2px;
        background: white;
        margin-bottom: 3rem;
    }

    .hero h1{
        color: #FFFF3A;
        max-width: 900px;
        margin: 0 0 2rem 0;
        font-size: clamp(2.5rem, 5vw, 5rem);
        line-height: 1.08;
        font-weight: 500;
    }

  #virtual {
    height: 150vh; /* Make the page scrollable with a 150% view height */
  }

  .slot{
    height: 120px;
    
  }

  .hero p {
    font-size: 1.5rem;
    color: white;
    margin: 0;
    max-width: 760px;
    line-height: 1.4;
  }
</style>
