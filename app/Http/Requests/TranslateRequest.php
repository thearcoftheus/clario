<?php

namespace App\Http\Requests;

use App\Models\ApiMetric;
use Illuminate\Validation\Rule;

class TranslateRequest extends SettingsRequest {

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array {
        return [
            ...parent::rules(),
            'content' => ['required', 'string'],
            // Metrics only — recorded by TrackApiMetrics, never used to build
            // the prompt. Optional so an older extension build still works.
            'trigger' => ['nullable', Rule::in(ApiMetric::TRIGGERS)],
        ];
    }
}
