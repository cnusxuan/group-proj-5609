<script lang="ts">
    import type { TSong } from "../types";
    import * as d3 from "d3";
    import cloud from "d3-cloud";

    type Props = {
        songs: TSong[];
        width?: number;
        height?: number;
    };

    let { songs, width = 900, height = 500 }: Props = $props();

    let selectedSong: TSong | undefined = $state();
    let yearMin: number = $state(1965);
    let yearMax: number = $state(2016);

    const margin = { top: 30, bottom: 60, left: 70, right: 30 };

    const STOPWORDS = new Set(
        "the a an and or but of in on at to for with by is are was were be i you he she it we they my your this that as so do have has not no oh yeah hey ah uh la na da ooh just now then up down from".split(" "),
    );

    const PROFANITY = new Set(
        "fuck fucking fucked fuckin shit shitty bitch bitches nigga niggas nigger ass asshole damn dammit hell pussy dick cock cunt motherfucker mf bullshit".split(" "),
    );

    const HIGHLIGHT_COLORS = ["#ff5e5e","#ffb84d","#ffeb3b","#69e36b","#5eb3ff","#c285ff"];

    const GENRE_FONTS: Record<string, string> = {
        rap: "Bebas Neue",
        rock: "Metal Mania",
        pop: "Pacifico",
        rb: "Dancing Script",
        country: "Yellowtail",
        misc: "Playfair Display",
    };

    function getGenre(s: TSong): string {
        return Array.isArray(s.tag) ? s.tag[0] : s.tag ?? "Unknown";
    }

    function getCloudFont(s: TSong | undefined): string {
        if (!s) return "Dancing Script";
        const g = getGenre(s).toLowerCase();
        return GENRE_FONTS[g] ?? "Playfair Display";
    }

    const filteredSongs = $derived(
        songs.filter((s) => {
            const y = s.year.getFullYear();
            return y >= yearMin && y <= yearMax;
        }),
    );

    $effect(() => {
        if (filteredSongs.length === 0) return;
        const stillVisible = selectedSong && filteredSongs.includes(selectedSong);
        if (!stillVisible) {
            const topSong = filteredSongs.reduce((a, b) =>
                a.view_count >= b.view_count ? a : b,
            );
            selectedSong = topSong;
        }
    });

    const genres = $derived(Array.from(new Set(songs.map(getGenre))).sort());

    const colorScale = $derived(
        d3.scaleOrdinal<string>().domain(genres).range(d3.schemeSet1),
    );

    const xScale = $derived(
        d3.scaleLinear()
            .domain(d3.extent(songs, (d) => d.repetition_score) as [number, number])
            .range([margin.left, width - margin.right]),
    );

    const yScale = $derived(
        d3.scaleLog()
            .domain([
                Math.max(1, d3.min(songs, (d) => d.view_count) ?? 1),
                d3.max(songs, (d) => d.view_count) ?? 1,
            ])
            .range([height - margin.bottom, margin.top]),
    );

    let xAxis: SVGGElement;
    let yAxis: SVGGElement;

    $effect(() => {
        if (xAxis) d3.select(xAxis).call(d3.axisBottom(xScale));
        if (yAxis) d3.select(yAxis).call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".2s")));
    });

    function tokenize(text: string): string[] {
        return text.toLowerCase()
            .replace(/\[.*?\]/g, " ")
            .replace(/[^a-z'\s]/g, " ")
            .split(/\s+/)
            .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !PROFANITY.has(t));
    }

    function getWordCounts(lyrics: string): Map<string, number> {
        const counts = new Map<string, number>();
        for (const t of tokenize(lyrics)) {
            counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        return counts;
    }

    const wordCounts = $derived(
        selectedSong ? getWordCounts(selectedSong.lyrics) : new Map(),
    );

    const highlightMap = $derived.by(() => {
        const map = new Map<string, string>();
        const top = Array.from(wordCounts.entries())
            .filter(([, n]) => n >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
        top.forEach(([word], i) => map.set(word, HIGHLIGHT_COLORS[i]));
        return map;
    });

    const lyricParts = $derived.by(() => {
        if (!selectedSong) return [];
        const parts: { text: string; color: string | null }[] = [];
        const re = /([a-zA-Z']+)|([^a-zA-Z']+)/g;
        let m;
        while ((m = re.exec(selectedSong.lyrics)) !== null) {
            if (m[1]) parts.push({ text: m[1], color: highlightMap.get(m[1].toLowerCase()) ?? null });
            else if (m[2]) parts.push({ text: m[2], color: null });
        }
        return parts;
    });

    const legendChips = $derived(
        Array.from(highlightMap.entries()).map(([word, color]) => ({
            word, color, count: wordCounts.get(word) ?? 0,
        })),
    );

    const cloudWidth = 1400;
    const cloudHeight = 700;

    let cloudLayout: { text: string; size: number; x: number; y: number; rotate: number; color: string }[] = $state([]);
    let cloudFont = $state("Dancing Script");

    $effect(() => {
        if (!selectedSong) {
            cloudLayout = [];
            return;
        }

        const font = getCloudFont(selectedSong);
        cloudFont = font;

        const all = Array.from(wordCounts.entries())
            .filter(([, n]) => n >= 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 60);
        if (all.length === 0) {
            cloudLayout = [];
            return;
        }
        const maxN = all[0][1];
        const minN = all[all.length - 1][1];
        const repBoost = 0.5 + (selectedSong!.repetition_score - 0.30) / 0.65 * 1.0;
        const sizeScale = (n: number) =>
            Math.min(180, 28 + ((n - minN) / Math.max(1, maxN - minN)) ** 0.7 * 175 * repBoost);

        const wordsForCloud = all.map(([word, count]) => ({
            text: word,
            size: sizeScale(count),
            color: highlightMap.get(word) ?? "#bbb",
        }));

        cloud()
            .size([cloudWidth, cloudHeight])
            .words(wordsForCloud)
            .padding(5)
            .rotate(() => (Math.random() < 0.35 ? 90 : 0))
            .font(font)
            .fontSize((d: any) => d.size)
            .on("end", (laidOut: any) => {
                cloudLayout = laidOut.map((d: any) => ({
                    text: d.text,
                    size: d.size,
                    x: d.x,
                    y: d.y,
                    rotate: d.rotate,
                    color: (wordsForCloud.find((w) => w.text === d.text) ?? { color: "#bbb" }).color,
                }));
            })
            .start();
    });
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Dancing+Script:wght@500;700&family=Metal+Mania&family=Pacifico&family=Yellowtail&family=Playfair+Display:ital,wght@0,700;1,700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="spotlight-section">
    <div class="spotlight-inner">
        <div class="spotlight-header">
            <div class="title-line"></div>
            <h2>Hear It in the Lyrics</h2>
            <p class="source">Genius Song Lyrics</p>
        </div>

        <div class="year-control">
            <label>
                From <span class="year-value">{yearMin}</span>
                <input type="range" min="1965" max="2016" bind:value={yearMin} />
            </label>
            <label>
                To <span class="year-value">{yearMax}</span>
                <input type="range" min="1965" max="2016" bind:value={yearMax} />
            </label>
            <span class="song-count">{filteredSongs.length} songs</span>
        </div>

        <svg {width} {height} class="scatter-svg">
            <text x={(margin.left + width - margin.right) / 2} y={height - 15}
                  text-anchor="middle" fill="white" font-size="13">Repetition Score</text>
            <text transform={`translate(20, ${(margin.top + height - margin.bottom) / 2}) rotate(-90)`}
                  text-anchor="middle" fill="white" font-size="13">Views</text>

            {#each filteredSongs as song}
                <circle
                    cx={xScale(song.repetition_score)}
                    cy={yScale(Math.max(1, song.view_count))}
                    r={selectedSong === song ? 8 : 4}
                    fill={selectedSong === song ? "white" : colorScale(getGenre(song))}
                    opacity={selectedSong === song ? 1 : 0.55}
                    stroke={selectedSong === song ? "white" : "none"}
                    stroke-width={selectedSong === song ? 2 : 0}
                    style="cursor: pointer; transition: r 0.2s ease;"
                    onclick={() => (selectedSong = selectedSong === song ? undefined : song)}
                />
            {/each}

            <g color="white" transform={`translate(0, ${height - margin.bottom})`} bind:this={xAxis} />
            <g color="white" transform={`translate(${margin.left}, 0)`} bind:this={yAxis} />
        </svg>

        <div class="hint">
            <span class="hint-arrow">↑</span>
            Drag the year sliders. Click any point.
            <br/>
            <span class="hint-secondary">See its lyrics and word cloud, just like the three songs at the top.</span>
        </div>

        {#if selectedSong}
            <div class="lyric-card">
                <h3>"{selectedSong.title}"</h3>
                <p class="meta-line">
                    {selectedSong.artist} · {getGenre(selectedSong)} ·
                    {selectedSong.year.getFullYear()} ·
                    {d3.format(".2s")(selectedSong.view_count)} views ·
                    repetition <strong>{selectedSong.repetition_score.toFixed(2)}</strong>
                </p>

                {#if legendChips.length > 0}
                    <div class="highlight-legend">
                        {#each legendChips as chip}
                            <span class="legend-chip" style={`background: ${chip.color};`}>
                                {chip.word} ({chip.count})
                            </span>
                        {/each}
                    </div>
                {/if}

                <div class="lyric-body">
                    {#each lyricParts as part}
                        {#if part.color}
                            <span style={`background: ${part.color}; color: black; padding: 0 0.45em; border-radius: 999px;`}>{part.text}</span>
                        {:else}
                            <span>{part.text}</span>
                        {/if}
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>

{#if selectedSong && cloudLayout.length > 0}
    <div class="cloud-section">
        <div class="cloud-inner">
            <div class="cloud-header">
                <div class="title-line-light"></div>
                <h2>Word Cloud</h2>
                <p class="cloud-subtitle">"{selectedSong.title}" — {getGenre(selectedSong)}</p>
            </div>

            <svg
                viewBox={`${-cloudWidth / 2} ${-cloudHeight / 2} ${cloudWidth} ${cloudHeight}`}
                class="cloud-svg"
                preserveAspectRatio="xMidYMid meet"
            >
                <g>
                    {#each cloudLayout as w}
                        <text
                            text-anchor="middle"
                            transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                            font-family={`${cloudFont}, cursive`}
                            font-weight="700"
                            font-size={w.size}
                            fill={w.color}
                        >
                            {w.text}
                        </text>
                    {/each}
                </g>
            </svg>
        </div>
    </div>
{/if}

<style>
    .spotlight-section {
        background: #000;
        min-height: 100vh;
        padding: 4rem 2rem;
        display: flex;
        justify-content: center;
    }
    .spotlight-inner {
        width: 100%;
        max-width: 1100px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .spotlight-header {
        margin-bottom: 2rem;
        text-align: center;
    }
    .title-line {
        width: 240px;
        height: 2px;
        background: white;
        margin: 0 auto 1.5rem;
    }
    .spotlight-header h2 {
        margin: 0;
        color: white;
        font-size: clamp(2rem, 3vw, 3rem);
        font-weight: 700;
    }
    .source {
        margin: 0.5rem 0 0;
        color: #e5e548;
        font-size: 1.25rem;
    }
    .year-control {
        display: flex;
        gap: 2rem;
        align-items: center;
        margin-bottom: 1.5rem;
        color: white;
    }
    .year-control label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .year-value {
        color: #e5e548;
        font-weight: 700;
    }
    .year-control input[type="range"] {
        width: 200px;
    }
    .song-count {
        color: #aaa;
        font-size: 0.9rem;
    }
    .scatter-svg {
        background: #0a0a0a;
        border-radius: 12px;
    }
    .hint {
        margin: 2.5rem 0 1.5rem 0;
        text-align: center;
        font-family: "Playfair Display", serif;
        font-style: italic;
        font-size: 1.4rem;
        color: #ddd;
        line-height: 1.5;
    }

    .hint-arrow {
        display: inline-block;
        margin-right: 0.4em;
        animation: bounceUp 1.6s ease-in-out infinite;
    }

    .hint-secondary {
        color: #888;
        font-size: 0.95rem;
        font-style: italic;
    }

    @keyframes bounceUp {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
    }
    .lyric-card {
        margin-top: 2rem;
        width: 100%;
        max-width: 900px;
        background: #dfe248;
        border-radius: 20px;
        padding: 2.5rem 3rem;
        color: black;
        box-shadow: 10px 12px 0 rgba(52, 52, 52, 0.77);
    }
    .lyric-card h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.75rem;
    }
    .meta-line {
        margin: 0;
        color: #333;
    }
    .highlight-legend {
        margin: 1.5rem 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    .legend-chip {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.9rem;
        font-weight: 600;
    }
    .lyric-body {
        white-space: pre-wrap;
        line-height: 1.7;
        max-height: 500px;
        overflow-y: auto;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 12px;
    }

    .cloud-section {
        background: #000;
        min-height: 100vh;
        padding: 4rem 2rem 6rem;
        display: flex;
        justify-content: center;
    }
    .cloud-inner {
        width: 100%;
        max-width: 1400px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .cloud-header {
        margin-bottom: 2.5rem;
        text-align: center;
    }
    .title-line-light {
        width: 240px;
        height: 2px;
        background: white;
        margin: 0 auto 1.5rem;
    }
    .cloud-header h2 {
        margin: 0;
        color: white;
        font-size: clamp(2rem, 3vw, 3rem);
        font-weight: 700;
    }
    .cloud-subtitle {
        margin: 0.5rem 0 0;
        color: #e5e548;
        font-size: 1.1rem;
        font-style: italic;
    }
    .cloud-svg {
        width: 100%;
        max-width: 1400px;
        height: auto;
        min-height: 600px;
    }
</style>
