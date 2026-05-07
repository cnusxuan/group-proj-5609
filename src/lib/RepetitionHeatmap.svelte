<script lang="ts">
  import type { TSong } from "../types";
  import * as d3 from "d3";
  import { onMount } from "svelte";

  type Props = {
    songs: TSong[];
    width?: number;
    height?: number;
  };

  let { songs, width = 800, height = 500 }: Props = $props();

  let hoveredCell: any = $state(null);
  let scrollProgress: number = $state(0);
  let heatmapSection: HTMLDivElement;

  const margin = {
    top: 60,
    bottom: 70,
    left: 80,
    right: 30,
  };

  function getDecadeGenreRepetition(songs: TSong[]) {
    let grouped: { [key: string]: { total: number; count: number } } = {};
    let allDecades = new Set<string>();
    let allTags = new Set<string>();

    songs.forEach((song) => {
      let decade = Math.floor(song.year.getFullYear() / 10) * 10 + "s";
      let tag = song.tag;
      let key = decade + "-" + tag;

      allDecades.add(decade);
      allTags.add(tag);

      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0 };
      }

      grouped[key].total += song.repetition_score;
      grouped[key].count += 1;
    });

    let decades = Array.from(allDecades)
      .sort()
      .filter((d) => d >= "1960s" && d <= "2010s");

    let tags = Array.from(allTags).sort();

    let matrix: {
      decade: string;
      tag: string;
      avgRepetition: number;
      count: number;
    }[] = [];

    for (let decade of decades) {
      for (let tag of tags) {
        let key = decade + "-" + tag;
        let data = grouped[key];

        matrix.push({
          decade,
          tag,
          avgRepetition: data ? data.total / data.count : 0,
          count: data ? data.count : 0,
        });
      }
    }

    return { decades, tags, matrix };
  }

  const heatData = $derived(getDecadeGenreRepetition(songs));

  const xScale = $derived(
    d3
      .scaleBand()
      .domain(heatData.decades)
      .range([margin.left, width - margin.right]),
  );

  const yScale = $derived(
    d3
      .scaleBand()
      .domain(heatData.tags)
      .range([margin.top, height - margin.bottom]),
  );

  const validScores = $derived(
    heatData.matrix.filter((d) => d.count > 0).map((d) => d.avgRepetition),
  );

  const minRepetition = $derived(Math.min(...validScores));
  const maxRepetition = $derived(Math.max(...validScores));
  const midRepetition = $derived((minRepetition + maxRepetition) / 2);

  const colorScale = $derived(
    d3
      .scaleSequential((t) => d3.interpolateRdBu(1 - t))
      .domain([minRepetition, maxRepetition]),
  );

  const xCellWidth = $derived(xScale.bandwidth());
  const yCellHeight = $derived(yScale.bandwidth());

  const currentScore = $derived(
    minRepetition + scrollProgress * (maxRepetition - minRepetition),
  );

  const activeScore = $derived(
    [...heatData.matrix]
      .filter((d) => d.count > 0)
      .sort(
        (a, b) =>
          Math.abs(a.avgRepetition - currentScore) -
          Math.abs(b.avgRepetition - currentScore),
      )[0]?.avgRepetition,
  );

  const activeCells = $derived(
    heatData.matrix.filter((d) => {
      if (d.count <= 0 || activeScore === undefined) return false;

      return d.avgRepetition.toFixed(2) === activeScore.toFixed(2);
    }),
  );

  const displayCells = $derived(hoveredCell ? [hoveredCell] : activeCells);

  const legendWidth = $derived(width - margin.left - margin.right);
  const legendX = $derived(margin.left + scrollProgress * legendWidth);

  onMount(() => {
    function updateScrollProgress() {
      if (!heatmapSection) return;

      const rect = heatmapSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const totalScrollable = rect.height - viewportHeight;
      const rawProgress = -rect.top / totalScrollable;

      scrollProgress = Math.max(0, Math.min(1, rawProgress));
    }

    updateScrollProgress();

    window.addEventListener("scroll", updateScrollProgress);
    window.addEventListener("resize", updateScrollProgress);

    return () => {
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
    };
  });
</script>

<div class="heatmap-scroll-section" bind:this={heatmapSection}>
  <div class="heatmap-sticky">

    {#if songs.length > 0}
      <div class="heatmap-wrapper">
      <svg {width} {height}>
        {#each heatData.matrix as cell}
          <rect
            x={xScale(cell.decade)}
            y={yScale(cell.tag)}
            width={xCellWidth}
            height={yCellHeight}
            fill={cell.count > 0 ? colorScale(cell.avgRepetition) : "#eee"}
            stroke="#fff"
            stroke-width="1"
            style="cursor: pointer;"
            onmouseover={() => {
              hoveredCell = cell;
            }}
            onmouseout={() => {
              hoveredCell = null;
            }}
          />
        {/each}

        {#each displayCells as cell}
          {#if cell.count > 0}
            <rect
              x={xScale(cell.decade)! - 4}
              y={yScale(cell.tag)! - 4}
              width={xCellWidth + 8}
              height={yCellHeight + 8}
              fill={colorScale(cell.avgRepetition)}
              stroke="#fff"
              stroke-width="2"
              pointer-events="none"
              style="filter: drop-shadow(0 6px 16px rgba(0,0,0,0.7));"
            />
          {/if}
        {/each}

        {#if hoveredCell && hoveredCell.count > 0}
  <text
    x={width / 2}
    y={20}
    text-anchor="middle"
    font-size="12"
    fill="white"
  >
    {hoveredCell.tag} in {hoveredCell.decade}: {hoveredCell.avgRepetition.toFixed(2)}
    ({hoveredCell.count} songs)
  </text>
{:else if activeScore !== undefined}
  <text
    x={width / 2}
    y={20}
    text-anchor="middle"
    font-size="12"
    fill="white"
  >
    Repetition Score: {activeScore.toFixed(2)}
    ({displayCells.length} matching cells)
  </text>
{/if}

        {#each heatData.decades as decade}
          <text
            x={xScale(decade)! + xCellWidth / 2}
            y={margin.top - 8}
            text-anchor="middle"
            fill="white"
            font-size="10"
          >
            {decade}
          </text>
        {/each}

        {#each heatData.tags as tag}
          <text
            x={margin.left - 8}
            y={yScale(tag)! + yCellHeight / 2 + 4}
            text-anchor="end"
            fill="white"
            font-size="10"
          >
            {tag}
          </text>
        {/each}

        <defs>
          <linearGradient id="lg" x1="0" x2="1">
            <stop offset="0%" stop-color={colorScale(minRepetition)} />
            <stop offset="50%" stop-color={colorScale(midRepetition)} />
            <stop offset="100%" stop-color={colorScale(maxRepetition)} />
          </linearGradient>
        </defs>

        <rect
          x={margin.left}
          y={height - 45}
          width={legendWidth}
          height={12}
          fill="url(#lg)"
        />

        <circle cx={legendX} cy={height - 39} r="6" fill="white" />

        <text x={margin.left} y={height - 20} fill="white" font-size="10">
          {minRepetition.toFixed(2)} Low
        </text>

        <text
          x={(margin.left + width - margin.right) / 2}
          y={height - 20}
          text-anchor="middle"
          fill="white"
          font-size="10"
        >
          {midRepetition.toFixed(2)} Mid
        </text>

        <text
          x={width - margin.right}
          y={height - 20}
          text-anchor="end"
          fill="white"
          font-size="10"
        >
          {maxRepetition.toFixed(2)} High
        </text>
      </svg>
      <p class="heatmap-note">
      Note: Each cell represents the average repetition score for a genre within a decade.
      Warmer colors indicate higher repetition, while cooler colors indicate lower repetition.
    </p>
    </div>
    {/if}
  </div>
</div>

<style>
  .heatmap-scroll-section {
    height: 220vh;
    position: relative;
  }

  .heatmap-sticky {
    position: sticky;
    top: 30px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  h3 {
    color: white;
  }

  .heatmap-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.heatmap-note {
  margin-top: 1.2rem;
  max-width: 700px;
  text-align: center;
  font-size: 0.95rem;
  color: #a3a3a3;
  line-height: 1.4;
}
</style>