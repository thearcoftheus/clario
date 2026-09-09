<?php

namespace App\Http\Requests;

use App\Enums\SimplificationLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FeedbackReportRequest extends FormRequest {

    // Client-side caps are mirrored here so a hand-rolled POST can't blow past
    // them. Keep in sync with resources/js/lib/reportCopy.ts.
    public const MAX_COMMENT_LENGTH = 5000;
    public const MAX_NAME_LENGTH = 200;
    public const MAX_SIMPLIFIED_TEXT_BYTES = 100 * 1024;
    // The extracted article is usually LARGER than its simplified version, so
    // it gets its own budget rather than sharing one. The route's body limit
    // (see routes/api.php) must stay comfortably above the sum of the two.
    public const MAX_ORIGINAL_TEXT_BYTES = 100 * 1024;

    /**
     * Panes a report can come from. The first five mirror the extension's
     * `View` union (resources/js/composables/useNavigation.ts); 'settings' and
     * 'other' cover surfaces that aren't views.
     */
    public const PANES = ['home', 'summary', 'narrate', 'avatar', 'chat', 'settings', 'other'];

    /**
     * Authorization is handled upstream by the ValidateApiKey middleware.
     */
    public function authorize(): bool {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array {
        return [
            'comment' => ['required', 'string', 'max:' . self::MAX_COMMENT_LENGTH],
            'name' => ['nullable', 'string', 'max:' . self::MAX_NAME_LENGTH],

            'browser_id' => ['required', 'uuid'],

            'page_url' => ['required', 'string', 'max:2048'],
            'page_title' => ['nullable', 'string', 'max:1024'],

            // Byte caps are enforced by the controller, not here — see the
            // note on simplified_text below.
            'original_text' => ['nullable', 'string'],
            'original_truncated' => ['nullable', 'boolean'],

            'pane' => ['required', Rule::in(self::PANES)],

            'reading_level' => ['nullable', Rule::enum(SimplificationLevel::class)],
            'level_mode' => ['nullable', Rule::in(['manual', 'auto'])],

            'slide_index' => ['nullable', 'integer', 'min:1'],
            'slide_count' => ['nullable', 'integer', 'min:1'],

            // Length is checked in bytes by the controller (see the truncation
            // note there); a character cap here would be the wrong unit.
            'simplified_text' => ['nullable', 'string'],
            'truncated' => ['nullable', 'boolean'],

            'extension_version' => ['nullable', 'string', 'max:20'],
            'user_agent' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Plain-language messages. These surface to a tester only in the unlikely
     * case the client-side guard is bypassed, but they shouldn't read like a
     * stack trace when they do.
     */
    public function messages(): array {
        return [
            'comment.required' => 'Please write a message first.',
            'comment.max' => 'That message is too long. Please shorten it.',
        ];
    }
}
