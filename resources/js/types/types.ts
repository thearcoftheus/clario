export type FleschKincaidReadability = { score: number; grade: number };

// Lives here rather than in chatStore because historyStore keeps each tab's
// transcript on its HistoryItem, and chatStore already imports historyStore.
export type ChatMessage = {
    sender: 'user' | 'assistant';
    text: string;
};
