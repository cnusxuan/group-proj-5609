<script lang="ts">
    import type { TSong } from "../types";
    import * as d3 from "d3";

    type AnyScale =
        | d3.ScaleBand<string>
        | d3.ScaleLinear<number, number>
        | d3.ScaleLogarithmic<number, number>
        | d3.ScaleTime<number, number>;

    type TProps = {
        songs: TSong[];
        x: keyof TSong; // for simplicity, we assume x
        y: keyof TSong;
        width?: number;
        height?: number;
    };
    const { songs: songs, x, y, height = 300, width = 450 }: TProps = $props();

    let selectedSong: TSong | undefined = $state();
    let hiddenGenres: Set<string> = $state(new Set());
    let minViews: number = $state(1000000);

    let filteredSongs: TSong[] = $derived(
        songs.filter(
            (d) => d.view_count >= minViews && !hiddenGenres.has(getGenre(d)),
        ),
    );

    let grouped = $derived(Object.groupBy(filteredSongs, (d) => d.tag));

    const margin = {
        top: 20,
        bottom: 60,
        left: 70,
        right: 20,
    };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
    };
    const sizeRange = [3, 15];

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

    function applyScale(scale: AnyScale | null, value: unknown): number {
        if (!scale) return 0;
        return (scale as (v: any) => number)(value);
    }

    function getScale(
        attrName: keyof TSong,
        axis: "x" | "y" | "color" | "size",
        songs: TSong[],
    ): AnyScale | null {
        if (songs.length == 0) {
            return null;
        }

        let range: number[] = [0, 0];
        if (axis == "x") {
            range = [usableArea.left, usableArea.right];
        } else if (axis == "y") {
            range = [usableArea.bottom, usableArea.top];
        } else if (axis == "size") {
            range = sizeRange;
        }

        if (typeof songs[0][attrName] == "string") {
            return d3
                .scaleBand()
                .domain(songs.map((d) => d[attrName] as string))
                .range(range);
        } else if (typeof songs[0][attrName] == "number") {
            const ext = d3.extent(songs, (d) => d[attrName] as number) as [
                number,
                number,
            ];

            if (axis == "y") {
                return d3
                    .scaleLog()
                    .domain([Math.max(1, ext[0]), ext[1]])
                    .range(range);
            }
            return d3.scaleLinear().domain(ext).range(range);
        } else if (songs[0][attrName] instanceof Date) {
            return d3
                .scaleTime()
                .domain(
                    d3.extent(songs, (d) => d[attrName] as Date) as [
                        Date,
                        Date,
                    ],
                )
                .range(range);
        } else if (typeof songs[0][attrName] == "object") {
            // array
            let allValues = songs
                .map((d) => d[attrName] as string[])
                .reduce((acc, val) => acc.concat(val), []);
            return d3
                .scaleBand()
                .domain([...new Set(allValues)])
                .range(range);
        } else {
            return null;
        }
    }

    const colorScale = $derived(
        d3.scaleOrdinal<string>().domain(genres).range(d3.schemeSet1),
    );

    function getPointFill(song: TSong) {
        const genre = getGenre(song);
        if (selectedSong === song) {
            return "black";
        }
        return colorScale(genre) ?? "lightgray";
    }

    function getPointOp(song: TSong) {
        if (selectedSong === song) {
            return 1;
        }
        return 0.5;
    }

    function getPointrad(song: TSong) {
        return selectedSong === song ? 7 : 3;
    }

    const xScale = $derived(getScale(x, "x", filteredSongs));
    const yScale = $derived(getScale(y, "y", filteredSongs));

    let xAxes: SVGGElement[] = $state([]),
        yAxes: SVGGElement[] = $state([]);

    function updateAxes() {
        if (!xScale || !yScale) {
            return;
        }

        xAxes.forEach((axis: SVGGElement) => {
            if (!axis) return;

            d3.select(axis)
                .call(d3.axisBottom(xScale as d3.AxisScale<d3.AxisDomain>))
                .selectAll("text")
                .attr("transform", "rotate(60)")
                .style("text-anchor", "start");
        });

        yAxes.forEach((axis: SVGGElement) => {
            if (!axis) return;

            d3.select(axis).call(d3.axisLeft(yScale as d3.AxisScale<d3.AxisDomain>));
        });
    }

    function handleSongClick(song: TSong) {
        if (selectedSong == song) {
            selectedSong = undefined;
        } else {
            selectedSong = song;
        }
    }

    function handleLegendClick(genre: string) {
        const next = new Set(hiddenGenres);
        if (next.has(genre)) {
            next.delete(genre);
        } else {
            next.add(genre);
        }
        hiddenGenres = next;
    }

    // the $effect function is used to run a function whenever the reactive variables change, also known as a side effect
    $effect(() => {
        updateAxes();
    });
</script>

<div class="scatter-container">
    <div class="scatter-plots">
        {#each Object.entries(grouped) as [genre, songs], i}
            <svg {width} {height}>
                <g>
                    <g class="points">
                        {#each songs as song}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <circle
                                cx={xScale ? applyScale(xScale, song[x]) : usableArea.left}
                                cy={yScale
                                    ? applyScale(yScale, Math.max(1, song[y] as number))
                                    : usableArea.bottom}
                                r={getPointrad(song)}
                                fill={getPointFill(song)}
                                stroke="none"
                                opacity={getPointOp(song)}
                                onclick={() => handleSongClick(song)}
                            />
                        {/each}
                    </g>
                    <g
                        color="white"
                        transform="translate(0, {usableArea.bottom})"
                        bind:this={xAxes[i]}
                    />
                    <g
                        color="white"
                        transform="translate({usableArea.left}, 0)"
                        bind:this={yAxes[i]}
                    />
                    <text
                        x={(usableArea.left + usableArea.right) / 2}
                        y="20"
                        text-anchor="middle"
                        font-size="20"
                        font-weight="bold"
                        fill="white"
                        >{genre[0].toUpperCase() + genre.slice(1)}</text
                    >
                    <text
                        x={(usableArea.left + usableArea.right) / 2}
                        y={height - 10}
                        text-anchor="middle"
                        fill="white"
                    >
                        Repetition Score</text
                    >
                    <text
                        transform={`translate(15, ${(usableArea.top + usableArea.bottom) / 2}) rotate(-90)`}
                        text-anchor="middle"
                        fill="white"
                    >
                        Views</text
                    >
                </g>
            </svg>
        {/each}
    </div>
    <div class="side-panel">
        <div class="legend">
            <text>Click a genre below to hide its scatter plot</text>
            {#each Object.keys(grouped) as genre}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="legend-item"
                    class:hidden-genre={hiddenGenres.has(genre)}
                    onclick={() => handleLegendClick(genre)}
                >
                    <span
                        class="legend-color"
                        style={`background: ${hiddenGenres.has(genre) ? "#d1d5db" : colorScale(genre)}`}
                    >
                    </span>
                    <span>{genre}</span>
                </div>
            {/each}
        </div>

        <div class="viewFilter">
            Change the minimum number of views
            <input type="number" bind:value={minViews} min="100000" />
        </div>
        <div class="selectedInfo">
            {#if selectedSong}
                <p><strong>Title:</strong>{selectedSong.title}</p>
                <p><strong>Artist:</strong>{selectedSong.artist}</p>
                <p><strong>Genre:</strong>{getGenre(selectedSong)}</p>
                <p><strong>Views:</strong>{selectedSong.view_count}</p>
                <p>
                    <strong>Repetition Score:</strong
                    >{selectedSong.repetition_score}
                </p>
                <p><strong>Lyrics:</strong></p>
                <p>
                    {selectedSong.lyrics
                        ? selectedSong.lyrics.slice(0, 90) + "..."
                        : "No lyrics"}
                </p>
            {:else}
                "Click on a point to see details"
            {/if}
        </div>
    </div>
</div>

<style>
    /* add animation when the point transit */
    .points circle {
        transition:
            r 0.5s,
            cx 0.5s,
            cy 0.5s;
        cursor: pointer;
    }

    svg {
        display: inline-block; /* Ensures SVG appears inline with the div */
        vertical-align: top; /* Aligns SVG to the top of the div */
        gap: 30;
    }

    .selectedInfo {
        display: inline-block; /* Ensures div appears inline with SVG */
        vertical-align: top; /* Aligns div to the top of SVG */
        width: 250px; /* Set a fixed width for the div */
        color: #555;
        font-family: monospace;
        /*white-space: pre-wrap; /* Preserve formatting of JSON */
        background-color: #f9f9f9;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        overflow: auto; /* Add scroll if the content overflows */
    }

    .legend text {
        color: white;
    }

    .legend-color {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    .legend-item {
        color: white;
        cursor: pointer;
        user-select: none;
    }

    .hidden-genre {
        opacity: 0.4;
        text-decoration: line-through;
    }

    .viewFilter {
        color: white;
        width: 200px;
    }

    .scatter-container {
        display: flex;
        align-items: flex-start;
        gap: 20px;
    }

    .side-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 260px;
    }
</style>