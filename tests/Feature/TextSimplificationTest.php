<?php

use App\Services\TextSimplificationService;
use Mockery\MockInterface;

test('translate endpoint returns 400 when no text is provided', function () {
    $response = $this->postJson('/api/translate', []);

    $response->assertStatus(400)
        ->assertJson(['error' => 'No text provided']);
});

test('translate endpoint uses TextSimplificationService to simplify text', function () {

    // Mock the TextSimplificationService
    $this->mock(TextSimplificationService::class, function (MockInterface $mock) {

        $generator = function(){
            yield (object) ['text' => 'This is a simple text. ', 'finishReason' => null];
            yield (object) ['text' => 'Big words like making food from sun and tiny parts in cells are explained easily.', 'finishReason' => 'stop'];
        };

        $mock->shouldReceive('simplifyAsStream')
            ->once()
            ->with('This is a complex text with difficult words like photosynthesis and mitochondria.')
            ->andReturn($generator());
    });

    // Make the request
    $response = $this->withoutExceptionHandling()
        ->postJson('/api/translate', [
            'content' => 'This is a complex text with difficult words like photosynthesis and mitochondria.'
        ]);

    // Assert the response
    $response->assertStatus(200);

});
