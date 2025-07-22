<?php

use App\Services\SummaryAgent;
use Mockery\MockInterface;
use Prism\Prism\Text\PendingRequest;

test('translate endpoint returns 422 when no text is provided', function() {
    $response = $this->postJson('/api/translate', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['content']);
});

test('translate endpoint uses SummaryAgent to simplify text', function() {
    $generator = function() {
        yield (object)['text' => 'This is a simple text. ', 'finishReason' => null];
        yield (object)['text' => 'Big words like making food from sun and tiny parts in cells are explained easily.', 'finishReason' => 'stop'];
    };

    // Create a mock for PendingRequest
    $pendingRequest = $this->mock(PendingRequest::class);
    $pendingRequest->shouldReceive('asStream')
        ->once()
        ->andReturn($generator());

    // Mock the SummaryAgent
    $this->mock(SummaryAgent::class, function(MockInterface $mock) use ($pendingRequest) {
        $mock->shouldReceive('simplify')
            ->once()
            ->withArgs(function($content, $settings) {
                // Verify content
                if($content !== 'This is a complex text with difficult words like photosynthesis and mitochondria.'){
                    return false;
                }

                // Verify settings is an instance of Settings
                if(!($settings instanceof \App\DTO\Settings)){
                    return false;
                }

                return true;
            })
            ->andReturn($pendingRequest);
    });

    // Make the request
    $response = $this->withoutExceptionHandling()
        ->postJson('/api/translate', [
            'content' => 'This is a complex text with difficult words like photosynthesis and mitochondria.'
        ]);

    // Assert the response
    $response->assertStatus(200);
});
