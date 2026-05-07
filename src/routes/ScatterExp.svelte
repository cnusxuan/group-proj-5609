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

<div class="intro-text" class:show={visible} use:inView>
    <p>
        We calculated a repetition score for each song by examining their
        lyrics. We found the number of words that had already been used and
        divided it by the total word count. This gave us a quantifiable way to
        determine how repetitive a song is. For example, a song with the lyrics
        "One two two two three" would have a repetition score of 0.4 because out
        of there are 2 instances of words that had alreaby been used, divided by
        5 total words.
    </p>
</div>

<div class="intro-text"></div>

<style>
    .intro-text {
        margin: 1.5rem 0 2rem 0;
        max-width: 760px;
        opacity: 0;
        transform: translateY(20px);
        transition:
            opacity 0.9s ease-in,
            transform 0.9s ease-in;
    }

    .intro-text.show {
        opacity: 1;
        transform: translateY(0);
    }

    .intro-text p {
        margin: 0 0 1rem 0;
        font-size: 1.2rem;
        line-height: 1.5;
        color: white;
    }

    .intro-text p:last-child {
        margin-bottom: 0;
    }

    .repetition-explanation p {
        color: white;
    }
</style>
