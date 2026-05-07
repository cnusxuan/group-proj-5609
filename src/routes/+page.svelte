<script lang="ts">
    import * as d3 from "d3";
    import { Scatter, Line, GroupedBar, RepetitionHeatmap, LyricSpotlight, ThreePosters, QuizGate } from "$lib";
    import { onMount } from "svelte";
    import type { TSong } from "../types";
    import StoryOpen from "./StoryOpen.svelte";
    import Intro from "./Intro.svelte";
    import ScatterExp from "./ScatterExp.svelte";
    import GenreSection from "./GenreSection.svelte";
    import DecadeSection from "./DecadeSection.svelte";
    import LyricSection from "./LyricSection.svelte";
    import PosterSection from "./PosterSection.svelte";
    import BubbleSection from "./BubbleSection.svelte";
    import { DecadeMosaic, ThreeDScatter } from "$lib";
    import EndSection from "./EndSection.svelte";
    import GroupedBarExp from "./GroupedBarExp.svelte";

    let songs: TSong[] = $state([]);

    let yearRange: [Date, Date] = $state([
        new Date(1920, 0, 1),
        new Date(2021, 11, 31),
    ]);

    function getYearCountArray(songs: TSong[]) {
        let yearCount: { [year: number]: number } = {};
        const allYears = [...new Set(songs.map((d) => d.year.getFullYear()))];
        for (let year of allYears) {
            yearCount[year] = songs.filter(
                (d) => d.year.getFullYear() == year,
            ).length;
        }

        // Convert the map to an array of { year, count } objects
        const yearCountArray = Object.entries(yearCount).map(
            ([year, count]) => ({
                x: new Date(year),
                y: count as number,
            }),
        );

        // Sort the array by year in ascending order
        yearCountArray.sort((a, b) => (a.x < b.x ? -1 : 1));
        return yearCountArray;
    }

    type TAxisSelection = {
        x: keyof TSong;
        y: keyof TSong;
        size: keyof TSong;
    };

    let axisSelection: TAxisSelection = $state({
        x: "repetition_score",
        y: "view_count",
        size: "view_count",
    });

    async function loadCsv() {
        try {
            const csvUrl = "./lyrics_with_repetition_score.csv";
            songs = await d3.csv(csvUrl, (row) => {
                return {
                    title: row.title,
                    tag: row.tag,
                    artist: row.artist,
                    year: new Date(row.year),
                    view_count: Number(row.views),
                    features: row.features.split(","),
                    lyrics: row.lyrics,
                    total_word_count: Number(row.total_words),
                    unique_word_count: Number(row.unique_words),
                    repetition_score: Number(row.repetition_score),
                } as TSong;
            });
            songs = songs.filter((s) => s.lyrics !== "");
        } catch (error) {
            console.error("Error loading CSV:", error);
        }
    }

    onMount(loadCsv);
</script>

<div class="navbar">
    <img
        src="https://upload.wikimedia.org/wikipedia/commons/a/ad/Genius_website_logo.svg"
        class="logo"
    />
</div>
<StoryOpen />
<Intro />

<div class="container">
    {#if songs.length > 0}
        <!--<div class="selectors">
            X Axis:
            <select bind:value={axisSelection.x}>
                {#each attrOptionsX as key}
                    <option value={key}>{key}</option>
                {/each}
            </select>

            Y Axis:
            <select bind:value={axisSelection.y}>
                {#each attrOptionsY as key}
                    <option value={key}>{key}</option>
                {/each}
            </select>

            Size:
            <select bind:value={axisSelection.size}>
                {#each attrOptionsS as key}
                    <option value={key}>{key}</option>
                {/each}
            </select>
        </div>-->

        <div class="postersec">
            <PosterSection />
        </div>

        <ThreePosters {songs} />

        <section class="viz scatter-full">
            <div class="section-inner">
                <div class="viz-header">
                    <div class="title-row">
                        <h2>Scatter Plot</h2>
                        <div class="line"></div>
                    </div>
                    <p class="source">Repetition Score vs View Count</p>
                </div>
                <ScatterExp />
                <Scatter
                    songs={yearRange
                        ? songs.filter(
                              (d) =>
                                  d.year <= yearRange[1] &&
                                  d.year >= yearRange[0],
                          )
                        : songs}
                    x="repetition_score"
                    y="view_count"
                />
            </div>
        </section>

        <div class="genresec">
            <GenreSection />
        </div>

        <QuizGate
            question="Which genre repeats most?"
            options={["rap", "pop", "rb", "rock"]}
            correctAnswer="rb"
            feedback={{
                rb: "Correct. rb leads at 0.69, with pop close behind at 0.68.",
                pop: "So close, you picked second place. pop is at 0.68, just behind rb at 0.69.",
                rap: "Most people pick rap. But the answer is rb at 0.69. Rap actually comes in fourth.",
                rock: "Not quite. The answer is rb at 0.69. Rock sits near the bottom at 0.63."
            }}
        >

    <section class="viz">
        <div class="section-inner">
            <div class="bar-layout">
                <div class="bar-chart">
                    <GroupedBar {songs} />
                </div>

                <div class="bar-text">
                    <div class="viz-header">
                        <div class="title-row">
                            <h2>Grouped Bar Chart</h2>
                            <div class="line"></div>
                        </div>
                        <p class="source">Average Repetition Score by Genre</p>
                    </div>

                    <GroupedBarExp />
                </div>
            </div>
        </div>
    </section>
    </QuizGate>

        <div class="decadesec">
            <DecadeSection />
        </div>

        <QuizGate
            question="Which genre stayed the most repetitive across decades?"
            options={["rap", "pop", "rb", "rock"]}
            correctAnswer="rb"
            feedback={{
                rb: "Correct. rb stays high across every decade, the most consistently repetitive genre.",
                pop: "Close. pop is high too, but rb has stayed even more repetitive across the years.",
                rap: "Rap has high-repetition moments, but rb is the genre that stayed most repetitive across decades.",
                rock: "Rock actually stays on the lower end. The most consistently repetitive genre is rb."
            }}
        >

        <section class="viz">
            <div class="section-inner">
                <RepetitionHeatmap {songs} />
            </div>
        </section>
        </QuizGate>

        <div class="lyricsec">
            <LyricSection />
        </div>

        <LyricSpotlight {songs} />

        <div class="bubblesec">
            <BubbleSection />

        </div>
        <DecadeMosaic {songs} />
        <ThreeDScatter {songs} />
        <EndSection />
    {/if}
</div>

<style>
    :global(body) {
        margin: 0;
        font-family: "Inter", sans-serif;
        background-color: black;
        color: white;
    }
    .navbar {
        position: sticky;
        top: 0;
        z-index: 1000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background-color: #ffff3a;
    }

    .scatter-full {
        background: black;
        margin-left: -2rem;
        margin-right: -2rem;
        padding: 4rem 0;
        border-radius: 20px;
        box-sizing: border-box;

        transition:
            box-shadow 0.3s ease,
            transform 0.3s ease;
    }

    .scatter-full:hover {
        box-shadow: 0 0 40px rgba(255, 255, 255, 0.6);
        transform: translationY(-4px);
    }
    .logo {
        height: 40px;
    }

    .viz {
        width: 100%;
        display: flex;
        justify-content: center;
        padding: 4rem 2rem;
        box-sizing: border-box;
    }

    .section-inner {
        width: 100%;
    }

    .container {
        padding: 4rem 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4rem;
        color: black;
    }

    .viz-header {
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

    .line {
        width: 240px;
        height: 2px;
        background: black;
    }

    .source {
        margin: 0;
        color: #ff0061;
        font-size: 1.25rem;
    }
    .bar-layout {
        display: flex;
        align-items: flex-start;
        gap: 50px;
    }

    .bar-chart {
        flex: 2;
    }

    .bar-text {
        flex: 1;
        max-width: 420px;
    }

    .bar-text .viz-header {
        margin-bottom: 1.5rem;
    }
</style>
