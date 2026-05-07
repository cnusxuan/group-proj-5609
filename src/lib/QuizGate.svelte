<script lang="ts">
    type Props = {
        question: string;
        options: string[];
        correctAnswer: string;
        feedback: Record<string, string>;
        children?: any;
    };

    let { question, options, correctAnswer, feedback, children }: Props = $props();

    let selected: string | null = $state(null);

    function pick(option: string) {
        selected = option;
    }
</script>

<div class="quiz-wrapper">
    <div class="quiz-card">
        <p class="quiz-prompt">Before we look</p>
        <h3 class="quiz-question">{question}</h3>

        <div class="quiz-options">
            {#each options as option}
                <button
                    class="quiz-btn"
                    class:correct={selected !== null && option === correctAnswer}
                    class:wrong={selected === option && option !== correctAnswer}
                    class:dim={selected !== null && selected !== option && option !== correctAnswer}
                    onclick={() => pick(option)}
                    disabled={selected !== null}
                >
                    {option}
                </button>
            {/each}
        </div>

        {#if selected !== null}
            <p class="quiz-feedback">{feedback[selected] ?? feedback[correctAnswer]}</p>
        {/if}
    </div>

    {#if selected !== null}
        <div class="quiz-reveal">
            {@render children?.()}
        </div>
    {/if}
</div>

<style>
    .quiz-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .quiz-card {
        width: 100%;
        max-width: 760px;
        padding: 2.5rem 3rem;
        margin: 2rem auto;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 16px;
        color: white;
        box-sizing: border-box;
    }

    .quiz-prompt {
        margin: 0 0 0.5rem 0;
        color: #e5e548;
        font-family: "Playfair Display", serif;
        font-style: italic;
        font-size: 0.95rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .quiz-question {
        margin: 0 0 1.75rem 0;
        font-size: clamp(1.4rem, 2vw, 1.8rem);
        font-weight: 700;
        line-height: 1.3;
    }

    .quiz-options {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .quiz-btn {
        flex: 1 1 auto;
        min-width: 100px;
        padding: 0.85rem 1.5rem;
        background: transparent;
        border: 1.5px solid #555;
        border-radius: 999px;
        color: #ddd;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: lowercase;
    }

    .quiz-btn:hover:not(:disabled) {
        border-color: #e5e548;
        color: white;
    }

    .quiz-btn:disabled {
        cursor: default;
    }

    .quiz-btn.correct {
        background: #e5e548;
        border-color: #e5e548;
        color: black;
    }

    .quiz-btn.wrong {
        background: transparent;
        border-color: #aaa;
        color: #aaa;
        text-decoration: line-through;
    }

    .quiz-btn.dim {
        opacity: 0.35;
    }

    .quiz-feedback {
        margin: 0;
        padding-top: 1.25rem;
        border-top: 1px solid #333;
        color: #ddd;
        font-size: 1.05rem;
        line-height: 1.5;
        font-style: italic;
        animation: fadeIn 0.4s ease;
    }

    .quiz-reveal {
        width: 100%;
        animation: fadeInUp 0.6s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
