<script lang="ts">
    import type { TSong } from "../types";
    import * as d3 from "d3";
    import cloud from "d3-cloud";
    import { untrack } from "svelte";
    import { base } from "$app/paths";

    type Props = {
        songs: TSong[];
    };

    let { songs }: Props = $props();

    type PosterMeta = {
        title: string;
        artistMatch: string;
        album: string;
        year: number;
        image: string;
        narration: string;
        prompt: string;
    };

    const posterMeta: PosterMeta[] = [
        {
            title: "City of Stars/May Finally Come True",
            artistMatch: "Ryan Gosling",
            album: "La La Land",
            year: 2015,
            image: "/posters/city_of_stars.png",
            narration: "Ten years on, the song that barely repeats became the soundtrack of a generation.",
            prompt: "What does barely repeating sound like?",
        },
        {
            title: "Bohemian Rhapsody",
            artistMatch: "Queen",
            album: "A Night at the Opera",
            year: 1974,
            image: "/posters/bohemian_rhapsody.png",
            narration: "Five sections, no chorus, no formula. Repetition can be earned, not required.",
            prompt: "What words carry an opera?",
        },
        {
            title: "Get Lucky",
            artistMatch: "Daft Punk",
            album: "Random Access Memories",
            year: 2013,
            image: "/posters/get_lucky.png",
            narration: "92% repetition. 4 million plays. The same line, until you can't stop dancing.",
            prompt: "What does 92% repetition look like?",
        },
    ];

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

    function findSong(meta: PosterMeta): TSong | undefined {
        return songs.find(
            (s) =>
                s.title.toLowerCase().includes(meta.title.toLowerCase()) &&
                s.artist.toLowerCase().includes(meta.artistMatch.toLowerCase()),
        );
    }

    type CloudWord = {
        text: string;
        size: number;
        x: number;
        y: number;
        rotate: number;
        color: string;
    };

    type PosterData = {
        meta: PosterMeta;
        song: TSong | undefined;
        cloudLayout: CloudWord[];
        cloudFont: string;
    };

    let posterData: PosterData[] = $state(
        posterMeta.map((meta) => ({
            meta,
            song: undefined,
            cloudLayout: [],
            cloudFont: "Dancing Script",
        })),
    );

    let expanded: boolean[] = $state([false, false, false]);

    const cloudWidth = 1200;
    const cloudHeight = 600;

    $effect(() => {
        if (songs.length === 0) return;

        untrack(() => {
            const initialData = posterMeta.map((meta) => {
            const song = findSong(meta);
            return {
                meta,
                song,
                cloudLayout: [] as CloudWord[],
                cloudFont: getCloudFont(song),
            };
        });

        posterData = initialData;

        initialData.forEach((data, idx) => {
            if (!data.song) return;

            const wordCounts = getWordCounts(data.song.lyrics);

            const top = Array.from(wordCounts.entries())
                .filter(([, n]) => n >= 3)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);

            const highlightMap = new Map<string, string>();
            top.forEach(([word], i) => highlightMap.set(word, HIGHLIGHT_COLORS[i]));

            const all = Array.from(wordCounts.entries())
                .filter(([, n]) => n >= 1)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 60);

            if (all.length === 0) return;

            const maxN = all[0][1];
            const minN = all[all.length - 1][1];
            const repBoost = 0.5 + (data.song.repetition_score - 0.30) / 0.65 * 1.0;
            const sizeScale = (n: number) =>
                Math.min(160, 20 + ((n - minN) / Math.max(1, maxN - minN)) ** 0.7 * 130 * repBoost);

            const wordsForCloud = all.map(([word, count]) => ({
                text: word,
                size: sizeScale(count),
                color: highlightMap.get(word) ?? "#bbb",
            }));

            cloud()
                .size([cloudWidth, cloudHeight])
                .words(wordsForCloud)
                .padding(4)
                .rotate(() => (Math.random() < 0.35 ? 90 : 0))
                .font(data.cloudFont)
                .fontSize((d: any) => d.size)
                .on("end", (laidOut: any) => {
                    posterData = posterData.map((d, i) =>
                        i === idx
                            ? {
                                  ...d,
                                  cloudLayout: laidOut.map((w: any) => ({
                                      text: w.text,
                                      size: w.size,
                                      x: w.x,
                                      y: w.y,
                                      rotate: w.rotate,
                                      color: (wordsForCloud.find((wf) => wf.text === w.text) ?? { color: "#bbb" }).color,
                                  })),
                              }
                            : d,
                    );
                })
                .start();
        });
        });
    });

    function genreOf(data: PosterData): string {
        if (!data.song) return "—";
        return getGenre(data.song);
    }

    function repetitionOf(data: PosterData): string {
        if (!data.song) return "—";
        return data.song.repetition_score.toFixed(2);
    }

    function viewsOf(data: PosterData): string {
        if (!data.song) return "—";
        return d3.format(".2s")(data.song.view_count);
    }

    function toggleExpanded(i: number) {
        expanded[i] = !expanded[i];
    }
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,400;1,700&family=Bebas+Neue&family=Dancing+Script:wght@500;700&family=Metal+Mania&family=Pacifico&family=Yellowtail&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="posters-wrapper">
    {#each posterData as p, i}
        <section class="poster">
            <div class="poster-inner">
                <div class="top-row">
                    <div class="image-col">
                        <img src={`${base}${p.meta.image}`} alt={`${p.meta.album} cover`} />
                    </div>

                    <div class="text-col">
                        <h2 class="poster-title">{p.meta.title}</h2>
                        <p class="artist">{p.song?.artist ?? "—"}</p>
                        <p class="meta">{p.meta.album} · {p.meta.year} · {genreOf(p)}</p>

                        <div class="divider"></div>

                        <div class="stats">
                            <div class="stat">
                                <span class="stat-num">{repetitionOf(p)}</span>
                                <span class="stat-label">repetition</span>
                            </div>
                            <div class="stat">
                                <span class="stat-num">{viewsOf(p)}</span>
                                <span class="stat-label">views</span>
                            </div>
                        </div>

                        <p class="narration">{p.meta.narration}</p>

                        {#if p.cloudLayout.length > 0}
                            <button
                                class="expand-btn"
                                onclick={() => toggleExpanded(i)}
                                aria-expanded={expanded[i]}
                            >
                                {expanded[i] ? "↑ Hide" : `${p.meta.prompt} →`}
                            </button>
                        {/if}
                    </div>
                </div>

                {#if expanded[i] && p.cloudLayout.length > 0}
                    <div class="cloud-row">
                        <svg
                            viewBox={`${-cloudWidth / 2} ${-cloudHeight / 2} ${cloudWidth} ${cloudHeight}`}
                            class="cloud-svg"
                            preserveAspectRatio="xMidYMid meet"
                        >
                            <g>
                                {#each p.cloudLayout as w}
                                    <text
                                        text-anchor="middle"
                                        transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                                        font-family={`${p.cloudFont}, cursive`}
                                        font-weight="700"
                                        font-size={w.size}
                                        fill={w.color}
                                    >
                                        {w.text}
                                    </text>
                                {/each}
                            </g>
                        </svg>
                        <p class="cloud-hint">
                            Like what you see? Pick your own song from the scatter plot below. ↓
                        </p>
                    </div>
                {/if}
            </div>
        </section>
    {/each}
</div>

<style>
    .posters-wrapper {
        background: #000;
    }
    .poster {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6rem 2rem;
        box-sizing: border-box;
    }
    .poster-inner {
        width: 100%;
        max-width: 1300px;
        display: flex;
        flex-direction: column;
        gap: 3rem;
    }
    .top-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
        align-items: center;
    }
    .image-col {
        display: flex;
        justify-content: center;
    }
    .image-col img {
        width: 100%;
        max-width: 460px;
        height: auto;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        box-shadow: 16px 18px 0 rgba(229, 229, 72, 0.85),
                    0 25px 60px rgba(0, 0, 0, 0.6);
        border-radius: 4px;
    }
    .text-col {
        color: white;
    }
    .track-num {
        margin: 0 0 1rem 0;
        color: #888;
        font-family: "Playfair Display", serif;
        font-style: italic;
        font-size: 1rem;
        letter-spacing: 0.15em;
    }
    .poster-title {
        margin: 0 0 0.5rem 0;
        font-family: "Playfair Display", serif;
        font-weight: 800;
        font-size: clamp(2.4rem, 5vw, 4.2rem);
        line-height: 1.05;
        color: white;
    }
    .artist {
        margin: 0 0 0.25rem 0;
        font-size: 1.15rem;
        color: #ddd;
    }
    .meta {
        margin: 0;
        color: #888;
        font-size: 0.95rem;
        font-style: italic;
    }
    .divider {
        margin: 2rem 0;
        width: 60px;
        height: 2px;
        background: #e5e548;
    }
    .stats {
        display: flex;
        gap: 3rem;
        margin-bottom: 2rem;
    }
    .stat {
        display: flex;
        flex-direction: column;
    }
    .stat-num {
        font-family: "Playfair Display", serif;
        font-weight: 800;
        font-size: 2.4rem;
        color: #e5e548;
        font-variant-numeric: tabular-nums;
        line-height: 1;
    }
    .stat-label {
        margin-top: 0.4rem;
        font-size: 0.85rem;
        color: #888;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }
    .narration {
        margin: 0 0 2rem 0;
        font-family: "Playfair Display", serif;
        font-style: italic;
        font-size: clamp(1.1rem, 1.5vw, 1.4rem);
        line-height: 1.5;
        color: #ddd;
        max-width: 460px;
    }
    .expand-btn {
        background: transparent;
        border: 1px solid #444;
        color: #aaa;
        padding: 0.7rem 1.4rem;
        font-family: "Playfair Display", serif;
        font-style: italic;
        font-size: 0.95rem;
        letter-spacing: 0.03em;
        cursor: pointer;
        transition: all 0.25s ease;
        border-radius: 2px;
    }
    .expand-btn:hover {
        border-color: #888;
        color: white;
    }
    .cloud-row {
        display: flex;
        justify-content: center;
        animation: fadeIn 0.5s ease;
    }
    .cloud-hint {
        margin: 1.5rem 0 0 0;
        text-align: center;
        font-family: "Playfair Display", serif;
        font-style: italic;
        font-size: 1rem;
        color: #888;
        letter-spacing: 0.02em;
    }
    .cloud-svg {
        width: 100%;
        max-width: 1200px;
        height: auto;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 900px) {
        .top-row {
            grid-template-columns: 1fr;
            gap: 2rem;
        }
        .image-col img {
            max-width: 320px;
        }
        .stats {
            gap: 2rem;
        }
    }
</style>
