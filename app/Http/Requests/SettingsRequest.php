<?php

namespace App\Http\Requests;

use App\Enums\SimplificationLevel;
use App\Enums\SummaryLength;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SettingsRequest extends FormRequest {

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
            'settings' => ['nullable', 'array'],
            'settings.level' => ['nullable', Rule::enum(SimplificationLevel::class)],
            'settings.summaryLength' => ['nullable', Rule::enum(SummaryLength::class)],
            'settings.emoji' => ['nullable', 'boolean']
        ];
    }
}
