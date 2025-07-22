<?php

namespace App\Services;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;
use Prism\Prism\Text\PendingRequest;

abstract class BaseAgent {
    protected function getPrismRequest(): PendingRequest {
        return Prism::text()
            ->using(Provider::Gemini, 'gemini-2.5-flash')
            ->withMaxTokens(8000)
            ->withProviderOptions(['thinkingBudget' => 0]);
    }
}
