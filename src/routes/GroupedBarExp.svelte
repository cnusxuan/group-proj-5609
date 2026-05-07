<script lang="ts">
    let visible = false;

    function inView(node: HTMLElement) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    visible = true;
                    observer.disconnect();
                }
            },
            { threshold: 0.3 },
        );

        observer.observe(node);

        return {
            destroy() {
                observer.disconnect();
            },
        };
    }
</script>

<div class="bar-exp" class:show={visible} use:inView>
    <p>
        After looking at individual songs, we can compare repetition at the genre level.
    </p>

    <p>
        This bar chart shows the average repetition score for each genre, making it easier to see which genres tend to use more repeated lyrics overall.
    </p>

    <p>
        Higher bars mean that songs in that genre are more repetitive on average. This helps us move from individual song patterns to broader genre-level trends.
    </p>
</div>

<style>
    .bar-exp {
        margin: 1.5rem 0 2rem 0;
        max-width: 760px;
        opacity: 0;
        transform: translateY(20px);
        transition:
            opacity 0.9s ease-in,
            transform 0.9s ease-in;
    }

    .bar-exp.show {
        opacity: 1;
        transform: translateY(0);
    }

    .bar-exp p {
        margin: 0 0 1rem 0;
        font-size: 1.2rem;
        line-height: 1.5;
        color: white;
    }

    .bar-exp p:last-child {
        margin-bottom: 0;
        color: #ff0061;
    }
</style>