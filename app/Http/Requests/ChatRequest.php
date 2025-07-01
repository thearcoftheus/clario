<?php

namespace App\Http\Requests;

class ChatRequest extends SettingsRequest {

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
            'messages' => ['required', 'array'],
            'messages.*' => ['required', 'array'],
            'messages.*.sender' => ['required', 'string', 'in:user,assistant'],
            'messages.*.text' => ['required', 'string'],
        ];
    }
}
