import { describe, expect, it } from 'vitest';
import { classifyChatIntent } from './classifyChatIntent';

// The heuristic is deliberately precision-biased: misclassifying curiosity as
// struggle is the worse failure mode (pushes toward over-simplifying), so
// borderline phrasings are expected to fall through to 'other'.
describe('classifyChatIntent', () => {
    it.each([
        'What does inflation mean?',
        "what's an executive order",
        "I don't understand this part",
        "I'm confused about the second part",
        'explain the last paragraph',
        'Can you explain that more simply',
        'help me understand the vote',
        "I dont get it",
        'what are they talking about here',
    ])('classifies "%s" as clarification', message => {
        expect(classifyChatIntent(message)).toBe('clarification');
    });

    it.each([
        'tell me more about the election',
        'why did the senator vote no?',
        'what happened next?',
        'what is the capital of France', // "what is the…" is curiosity; only "what is a/an…" matches
        'who is the president',
        'That was interesting, thanks!',
        'im confused', // missing apostrophe forms are accepted losses, by design
        'please explain', // "explain" mid-message without "can you" is too ambiguous
    ])('classifies "%s" as other', message => {
        expect(classifyChatIntent(message)).toBe('other');
    });
});
