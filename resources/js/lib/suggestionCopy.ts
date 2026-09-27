// All user-facing text for the reading-level suggestion banner, in one place
// (same idea as reportCopy.ts). Two variants:
//   nudge    — manual mode ("I choose it"): Clario asks, the user decides
//   adaptive — adaptive mode ("Clario picks for me"): Clario already changed
//              the level and offers Undo
//
// Copy guidelines: simple reading level (roughly grades 2-3), adult tone,
// short sentences, address the reader as "you". "Simpler words" / "more
// detail" describe the outcome rather than naming the level, because the
// stored level names (Moderate, Challenging) differ from their display
// labels and neither is meaningful without the Settings screen open.

export const suggestionCopy = {
    ariaLabel: 'Reading level suggestion',

    nudge: {
        simpler: {
            message: 'Want Clario to use simpler words on pages like this?',
            accept: 'Yes, please',
            dismiss: 'No thanks',
        },
        more_detailed: {
            message: 'Want Clario to use a higher difficulty level on pages like this?',
            accept: 'Yes, please',
            dismiss: 'No thanks',
        },
    },

    adaptive: {
        simpler: {
            message: 'Clario switched to simpler words.',
            undo: 'Undo',
            keep: 'OK',
        },
        more_detailed: {
            message: 'Clario switched to a higher difficulty level.',
            undo: 'Undo',
            keep: 'OK',
        },
    },
} as const;
