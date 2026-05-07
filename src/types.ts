export type TSong = {
    title: string;
    tag: string;
    artist: string;
    year: Date;
    view_count: number;
    features: string[];
    lyrics: string;
    total_word_count: number;
    unique_word_count: number;
    repetition_score: number;
}