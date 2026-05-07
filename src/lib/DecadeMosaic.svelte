<script lang="ts">
    import type { TSong } from "../types";
    import * as d3 from "d3";

    type Props = {
        songs: TSong[];
        width?: number;
        height?: number;
    };

    let { songs, width = 600, height = 480 }: Props = $props();

    const yearMin: number = 1965;
    const YEAR_END = 2016;

    let progress: number = $state(0);
    let yearMax: number = $derived(Math.round(yearMin + progress * (YEAR_END - yearMin)));

    let stickyContainer: HTMLDivElement;
    let hoveredGenre: string | null = $state(null);

    function getGenre(s: TSong): string {
        return Array.isArray(s.tag) ? s.tag[0] : s.tag ?? "Unknown";
    }

    const filteredSongs = $derived(
        songs.filter((s) => {
            const y = s.year.getFullYear();
            return y >= yearMin && y <= yearMax;
        }),
    );

    const genres = $derived(Array.from(new Set(songs.map(getGenre))).sort());

    const colorScale = $derived(
        d3.scaleOrdinal<string>().domain(genres).range(d3.schemeSet1),
    );

    const REP_BUCKETS = [
        { label: "0.30-0.50", min: 0.0, max: 0.5 },
        { label: "0.50-0.60", min: 0.5, max: 0.6 },
        { label: "0.60-0.70", min: 0.6, max: 0.7 },
        { label: "0.70-0.80", min: 0.7, max: 0.8 },
        { label: "0.80-1.00", min: 0.8, max: 1.01 },
    ];

    const BUCKET_COLORS = ["#3b6ea5", "#a9c5dc", "#f1f1f1", "#f4a582", "#b2182b"];

    const genreCounts = $derived.by(() => {
        const counts = new Map<string, number>();
        for (const s of filteredSongs) {
            const g = getGenre(s);
            counts.set(g, (counts.get(g) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([genre, count]) => ({ genre, count }))
            .sort((a, b) => b.count - a.count);
    });

    const donutCenter = $derived({ x: width / 2, y: height / 2 });
    const donutOuterRadius = $derived(Math.min(width, height) / 2 - 20);
    const donutInnerRadius = $derived(donutOuterRadius * 0.55);

    const donutArcs = $derived.by(() => {
        if (genreCounts.length === 0) return [];
        const pie = d3.pie<{ genre: string; count: number }>()
            .value((d) => d.count)
            .sort(null);
        const arcGen = d3.arc<d3.PieArcDatum<{ genre: string; count: number }>>()
            .innerRadius(donutInnerRadius)
            .outerRadius(donutOuterRadius)
            .padAngle(0.01)
            .cornerRadius(2);
        const arcLabelGen = d3.arc<d3.PieArcDatum<{ genre: string; count: number }>>()
            .innerRadius((donutInnerRadius + donutOuterRadius) / 2)
            .outerRadius((donutInnerRadius + donutOuterRadius) / 2);
        return pie(genreCounts).map((d) => {
            const [lx, ly] = arcLabelGen.centroid(d);
            const angularSpan = d.endAngle - d.startAngle;
            return {
                genre: d.data.genre,
                count: d.data.count,
                path: arcGen(d) ?? "",
                labelX: lx,
                labelY: ly,
                showLabel: angularSpan > 0.25,
            };
        });
    });

    const stackData = $derived.by(() => {
        const result = genres.map((g) => {
            const songsInGenre = filteredSongs.filter((s) => getGenre(s) === g);
            const buckets = REP_BUCKETS.map((b) =>
                songsInGenre.filter((s) => s.repetition_score >= b.min && s.repetition_score < b.max).length,
            );
            return { genre: g, buckets, total: songsInGenre.length };
        });
        return result.sort((a, b) => b.total - a.total);
    });

    const stackMaxTotal = $derived(
        Math.max(...stackData.map((d) => d.total), 1),
    );

    const stackHeight = 480;
    const stackBarHeight = $derived(Math.min(50, stackHeight / Math.max(genres.length, 1) - 14));
    const stackLabelWidth = 80;
    const stackPadding = 14;

    function handleScroll() {
        if (!stickyContainer) return;
        const rect = stickyContainer.getBoundingClientRect();
        const total = stickyContainer.offsetHeight - window.innerHeight;
        if (total <= 0) {
            progress = 1;
            return;
        }
        const scrolled = -rect.top;
        const p = Math.max(0, Math.min(1, scrolled / total));
        progress = p;
    }

    $effect(() => {
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    });
</script>

<div class="mosaic-wrapper" bind:this={stickyContainer}>
    <div class="mosaic-sticky">
        <div class="mosaic-inner">
            <div class="mosaic-header">
                <div class="title-line"></div>
                <h2>Songs Through the Decades</h2>
                <p class="subtitle">Scroll to watch the years pass.</p>
            </div>

            <div class="progress-bar">
                <div class="progress-fill" style={`width: ${progress * 100}%`}></div>
            </div>

            <div class="dual-charts">
                <div class="chart-block">
                    <h3 class="chart-title">Genre Mix</h3>
                    <p class="chart-caption">Each slice sized by song count.</p>
                    <svg viewBox={`0 0 ${width} ${height}`} class="chart-svg">
                        <g transform={`translate(${donutCenter.x}, ${donutCenter.y})`}>
                            {#each donutArcs as a}
                                <g
                                    opacity={!hoveredGenre || hoveredGenre === a.genre ? 1 : 0.25}
                                    style="transition: opacity 0.2s ease;"
                                    onmouseover={() => (hoveredGenre = a.genre)}
                                    onmouseout={() => (hoveredGenre = null)}
                                    onfocus={() => (hoveredGenre = a.genre)}
                                    onblur={() => (hoveredGenre = null)}
                                    role="button"
                                    tabindex="0"
                                    aria-label={`${a.genre}: ${a.count} songs`}
                                >
                                    <path
                                        d={a.path}
                                        fill={colorScale(a.genre)}
                                        stroke="#000"
                                        stroke-width="1.5"
                                        style="cursor: pointer;"
                                    />
                                    {#if a.showLabel}
                                        <text
                                            x={a.labelX}
                                            y={a.labelY - 4}
                                            text-anchor="middle"
                                            dominant-baseline="middle"
                                            fill="white"
                                            font-size="15"
                                            font-weight="700"
                                            style="text-shadow: 0 1px 3px rgba(0,0,0,0.7); pointer-events: none;"
                                        >
                                            {a.genre}
                                        </text>
                                        <text
                                            x={a.labelX}
                                            y={a.labelY + 12}
                                            text-anchor="middle"
                                            dominant-baseline="middle"
                                            fill="rgba(255,255,255,0.85)"
                                            font-size="11"
                                            style="pointer-events: none;"
                                        >
                                            {a.count.toLocaleString()}
                                        </text>
                                    {/if}
                                </g>
                            {/each}

                            <text
                                text-anchor="middle"
                                dominant-baseline="middle"
                                y={-8}
                                fill="#e5e548"
                                font-size="42"
                                font-weight="800"
                                style="font-variant-numeric: tabular-nums; pointer-events: none;"
                            >
                                {yearMax}
                            </text>
                            <text
                                text-anchor="middle"
                                dominant-baseline="middle"
                                y={26}
                                fill="#aaa"
                                font-size="13"
                                style="pointer-events: none;"
                            >
                                {filteredSongs.length.toLocaleString()} songs
                            </text>
                            <text
                                text-anchor="middle"
                                dominant-baseline="middle"
                                y={44}
                                fill="#666"
                                font-size="10"
                                style="pointer-events: none;"
                            >
                                since 1965
                            </text>
                        </g>
                    </svg>

                    <div class="bucket-legend">
                        {#each genreCounts as g}
                            <span
                                class="bucket-item"
                                style:opacity={!hoveredGenre || hoveredGenre === g.genre ? 1 : 0.3}
                                onmouseover={() => (hoveredGenre = g.genre)}
                                onmouseout={() => (hoveredGenre = null)}
                                onfocus={() => (hoveredGenre = g.genre)}
                                onblur={() => (hoveredGenre = null)}
                                role="button"
                                tabindex="0"
                            >
                                <span class="bucket-swatch" style={`background: ${colorScale(g.genre)};`}></span>
                                {g.genre}
                            </span>
                        {/each}
                    </div>
                </div>


                <div class="chart-block">
                    <h3 class="chart-title">Repetition Spread</h3>
                    <p class="chart-caption">Each bar shows repetition distribution. Blue = low, red = high.</p>
                    <svg viewBox={`0 0 ${width} ${stackHeight}`} class="chart-svg">
                        {#each stackData as row, i}
                            {@const yPos = i * (stackBarHeight + stackPadding) + 30}
                            {@const totalWidth = (row.total / stackMaxTotal) * (width - stackLabelWidth - 60)}
                            <text
                                x={stackLabelWidth - 10}
                                y={yPos + stackBarHeight / 2}
                                text-anchor="end"
                                dominant-baseline="middle"
                                fill={!hoveredGenre || hoveredGenre === row.genre ? "white" : "#666"}
                                font-size="14"
                                font-weight="600"
                                style="transition: fill 0.2s ease; cursor: pointer;"
                                onmouseover={() => (hoveredGenre = row.genre)}
                                onmouseout={() => (hoveredGenre = null)}
                                onfocus={() => (hoveredGenre = row.genre)}
                                onblur={() => (hoveredGenre = null)}
                                role="button"
                                tabindex="0"
                            >
                                {row.genre}
                            </text>

                            {#each row.buckets as count, j}
                                {@const segWidth = row.total === 0 ? 0 : (count / row.total) * totalWidth}
                                {@const segX = stackLabelWidth + row.buckets.slice(0, j).reduce((acc, c) => acc + (row.total === 0 ? 0 : (c / row.total) * totalWidth), 0)}
                                <rect
                                    x={segX}
                                    y={yPos}
                                    width={segWidth}
                                    height={stackBarHeight}
                                    fill={BUCKET_COLORS[j]}
                                    opacity={!hoveredGenre || hoveredGenre === row.genre ? 1 : 0.25}
                                    style="transition: opacity 0.2s ease, width 0.4s cubic-bezier(0.4,0,0.2,1), x 0.4s cubic-bezier(0.4,0,0.2,1);"
                                    onmouseover={() => (hoveredGenre = row.genre)}
                                    onmouseout={() => (hoveredGenre = null)}
                                    onfocus={() => (hoveredGenre = row.genre)}
                                    onblur={() => (hoveredGenre = null)}
                                    role="button"
                                    tabindex="0"
                                    aria-label={`${row.genre} ${REP_BUCKETS[j].label}: ${count} songs`}
                                />
                            {/each}

                            <text
                                x={stackLabelWidth + totalWidth + 8}
                                y={yPos + stackBarHeight / 2}
                                dominant-baseline="middle"
                                fill={!hoveredGenre || hoveredGenre === row.genre ? "#aaa" : "#444"}
                                font-size="12"
                                style="transition: fill 0.2s ease; pointer-events: none;"
                            >
                                {row.total.toLocaleString()}
                            </text>
                        {/each}
                    </svg>

                    <div class="bucket-legend">
                        {#each REP_BUCKETS as b, i}
                            <span class="bucket-item">
                                <span class="bucket-swatch" style={`background: ${BUCKET_COLORS[i]};`}></span>
                                {b.label}
                            </span>
                        {/each}
                    </div>
                </div>
            </div>

            <p class="hover-hint">Hover a genre on either chart to highlight it on both.</p>
        </div>
    </div>
</div>

<style>
    .mosaic-wrapper {
        background: #000;
        position: relative;
        height: 350vh;
    }
    .mosaic-sticky {
        position: sticky;
        top: 0;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 2rem;
        box-sizing: border-box;
        overflow: hidden;
    }
    .mosaic-inner {
        width: 100%;
        max-width: 1400px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .mosaic-header {
        margin-bottom: 1.5rem;
        text-align: center;
    }
    .title-line {
        width: 240px;
        height: 2px;
        background: white;
        margin: 0 auto 1rem;
    }
    .mosaic-header h2 {
        margin: 0;
        color: white;
        font-size: clamp(1.8rem, 2.5vw, 2.6rem);
        font-weight: 700;
    }
    .subtitle {
        margin: 0.5rem 0 0;
        color: #e5e548;
        font-size: 1.05rem;
        font-style: italic;
    }
    .progress-bar {
        width: 80%;
        max-width: 500px;
        height: 3px;
        background: #222;
        margin-bottom: 1.5rem;
        border-radius: 999px;
        overflow: hidden;
    }
    .progress-fill {
        height: 100%;
        background: #e5e548;
        transition: width 0.05s linear;
    }
    .dual-charts {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        width: 100%;
    }
    .chart-block {
        flex: 1;
        min-width: 420px;
        max-width: 640px;
    }
    .chart-title {
        margin: 0 0 0.25rem 0;
        color: white;
        font-size: 1.2rem;
        font-weight: 700;
    }
    .chart-caption {
        margin: 0 0 0.75rem 0;
        color: #888;
        font-size: 0.85rem;
        font-style: italic;
    }
    .chart-svg {
        width: 100%;
        height: auto;
        max-height: 420px;
        background: #0a0a0a;
        border-radius: 12px;
    }
    .bucket-legend {
        margin-top: 0.75rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 1rem;
        color: #aaa;
        font-size: 0.78rem;
    }
    .bucket-item {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
    }
    .bucket-swatch {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 2px;
    }
    .hover-hint {
        margin-top: 1rem;
        color: #555;
        font-size: 0.85rem;
        font-style: italic;
        text-align: center;
    }
</style>
