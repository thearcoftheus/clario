// All user-facing text for the "Give feedback" flow, in one place so a copy
// pass from Katy/Cesar is a single-file change.
//
// Copy guidelines (from the build spec):
//   - Simple reading level, roughly grades 2-3.
//   - Adult tone. Simple is not the same as childish — never talk down.
//   - Short sentences, one idea each, active voice, address the reader as
//     "you". Same principles as the Easy Read prompt in
//     app/Enums/SimplificationLevel.php.

export const reportCopy = {
    // Sidebar footer entry point
    triggerLabel: 'Give Feedback',
    triggerAriaLabel: 'Give feedback about Clario',

    // Modal
    // "Give us feedback" rather than the earlier "Tell us what happened":
    // that read as if a single bad thing had to have gone wrong, while the
    // placeholder below invites praise and suggestions too. Matches the footer
    // button so people know they landed in the right place.
    heading: 'Give us feedback',
    description: 'Your message goes to the people who build Clario.',

    commentLabel: 'Your message',
    commentPlaceholder:
        'What do you want to tell us? You can tell us what went wrong, or what Clario can do better, or even what you liked!',
    commentRequiredError: 'Please write a message first.',

    nameLabel: 'Your name (you can leave this blank)',
    namePlaceholder: '',

    // Shown below the fields. Users see only the two inputs above, so this is
    // where we are honest about what else gets sent.
    //
    // "the words from that page" was added when we started storing the
    // extracted article text verbatim. The earlier wording ("the page you
    // were on") could fairly be read as just the web address, which would no
    // longer be true. Reword freely, but keep it explicit that the page's own
    // text is sent, not only the link.
    disclosure:
        'We will also save the page you were on, the words from that page, and what Clario showed you, so we can see what you saw.',

    submitLabel: 'Send',
    submittingLabel: 'Sending…',
    cancelLabel: 'Never mind',
    closeLabel: 'Close',

    // Outcome states
    successHeading: 'Thank you!',
    successBody: 'Your message went to the people who build Clario.',
    doneLabel: 'Done',

    // Network failure — the report is queued, so this is not an error state
    // from the user's point of view. Never tell them it failed.
    queuedHeading: 'Thank you!',
    queuedBody: 'We saved your message and will send it soon.',

    // The rare case where we could neither send nor save the report. Saying
    // "thank you, we got it" here would be a lie, so we say what happened and
    // give a way through. Keep the user's typing on screen so "Try again"
    // costs them nothing.
    errorHeading: 'Sorry, we could not send that.',
    errorBody: 'Please try again. If it keeps happening, you can email us at Tech@TheArc.org.',
    tryAgainLabel: 'Try again',
} as const;

// Mirrors the server-side caps in app/Http/Requests/FeedbackReportRequest.php.
export const MAX_COMMENT_LENGTH = 5000;
export const MAX_NAME_LENGTH = 200;
export const MAX_SIMPLIFIED_TEXT_BYTES = 100 * 1024;
export const MAX_ORIGINAL_TEXT_BYTES = 100 * 1024;
