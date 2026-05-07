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

  let selectedTag: string = $state("");
  let visible: boolean = $state(false);
  let chartContainer: HTMLDivElement;

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.3 },
    );

    if (chartContainer) {
      observer.observe(chartContainer);
    }

    return () => observer.disconnect();
  });

  function getGenreAvgRepetition(songs: TSong[]) {
    let grouped: { [tag: string]: { total: number; count: number } } = {};

    songs.forEach((song) => {
      let tag = song.tag;

      if (!grouped[tag]) {
        grouped[tag] = { total: 0, count: 0 };
      }

      grouped[tag].total += song.repetition_score;
      grouped[tag].count += 1;
    });

    let result: { tag: string; avgRepetition: number; count: number }[] = [];

    Object.entries(grouped).forEach(([tag, data]) => {
      result.push({
        tag,
        avgRepetition: data.total / data.count,
        count: data.count,
      });
    });

    return result.sort((a, b) => b.avgRepetition - a.avgRepetition);
  }

  const barData = $derived(getGenreAvgRepetition(songs));

  function getGenre(song: TSong) {
    const genre = song.tag;

    if (Array.isArray(genre)) {
      return genre[0] ?? "Unknown";
    }

    return (genre as string) ?? "Unknown";
  }

  const genres = $derived(
    Array.from(new Set(songs.map((song) => getGenre(song)))).sort(),
  );

  const colorScale = $derived(
    d3.scaleOrdinal<string>().domain(genres).range(d3.schemeSet1),
  );

  const margin = {
    top: 15,
    bottom: 50,
    left: 60,
    right: 10,
  };

  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
  };

  const xScale = $derived(
    d3
      .scaleBand()
      .range([usableArea.left, usableArea.right])
      .domain(barData.map((d) => d.tag))
      .padding(0.2),
  );

  const yScale = $derived(
    d3
      .scaleLinear()
      .range([usableArea.bottom, usableArea.top])
      .domain([0.4, d3.max(barData, (d) => d.avgRepetition) ?? 1]),
  );

  const xBarwidth: number = $derived(xScale.bandwidth());

  let xAxis: any = $state();
  let yAxis: any = $state();

  function updateAxis() {
    d3.select(xAxis)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start")
      .style("fill", "white");

    d3.select(xAxis).selectAll("path, line").style("stroke", "white");

    d3.select(yAxis)
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "white");

    d3.select(yAxis).selectAll("path, line").style("stroke", "white");
  }

  $effect(() => {
    updateAxis();
  });
</script>

<div class="bar-chart-container" bind:this={chartContainer}>

  {#if songs.length > 0}
    <svg {width} {height}>
      <g class="bars">
        {#each barData as d}
          <g class={d.tag}>
            <rect
              width={xBarwidth}
              height={visible ? usableArea.bottom - yScale(d.avgRepetition) : 0}
              x={xScale(d.tag)}
              y={visible ? yScale(d.avgRepetition) : usableArea.bottom}
              fill={colorScale(d.tag)}
              class="bar"
              opacity={selectedTag === "" || selectedTag === d.tag ? 1 : 0.3}
              onmouseover={() => {
                selectedTag = d.tag;
              }}
              onmouseout={() => {
                selectedTag = "";
              }}
            />

            <text
              fill="white"
              x={xScale(d.tag)! + xBarwidth / 2}
              y={visible ? yScale(d.avgRepetition) - 5 : usableArea.bottom}
              font-size="12"
              text-anchor="middle"
              class="bar-label"
              opacity={visible ? 1 : 0}
            >
              {selectedTag === d.tag
                ? d.tag + ": " + d.avgRepetition.toFixed(2)
                : d.avgRepetition.toFixed(2)}
            </text>
          </g>
        {/each}
      </g>

      <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
      <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />
    </svg>
  {/if}
</div>

<style>
  .bar-chart-container {
    width: fit-content;
  }

  .bar {
    transition:
      y 0.8s ease,
      height 0.8s ease,
      width 0.1s ease,
      opacity 0.2s ease;
    cursor: pointer;
  }

  .bar-label {
    transition:
      y 0.8s ease,
      opacity 0.5s ease 0.4s;
  }

  h3 {
    color: white;
  }
</style>