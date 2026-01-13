<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class NarrationRequest extends FormRequest {

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
            'content' => ['required', 'string', 'max:50000'], // Max 50k chars to prevent abuse
            'voice' => ['nullable', 'string'],
            'language' => ['nullable', 'string'],
            'speed' => ['nullable', 'numeric', 'min:0.25', 'max:4.0'],
            'pitch' => ['nullable', 'numeric', 'min:-20.0', 'max:20.0'],
            'gender' => ['nullable', 'string', 'in:male,female,neutral'],
        ];
    }
}
