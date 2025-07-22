<?php

/**
 * Tests for the /chat API endpoint
 * These tests verify that:
 * 1. The endpoint properly validates input parameters
 * 2. The endpoint returns appropriate error responses for invalid inputs
 * 3. The endpoint correctly uses the ChatAgent to respond to messages
 * 4. The endpoint returns a streaming response
 */

use App\DTO\Settings;
use App\Services\ChatAgent;
use Mockery\MockInterface;
use Prism\Prism\Text\PendingRequest;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;

/**
 * Test that the chat endpoint returns a 422 error when no content is provided
 * This test verifies that the endpoint properly validates the 'content' parameter
 * and returns an appropriate error response when it's missing.
 */
test('chat endpoint returns 422 when no content is provided', function() {
    $response = $this->postJson('/api/chat', [
        'messages' => []
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['content']);
});

/**
 * Test that the chat endpoint returns a 422 error when messages is not an array
 * This test verifies that the endpoint properly validates the 'messages' parameter
 * and returns an appropriate error response when it's not an array.
 */
test('chat endpoint returns 422 when messages is not an array', function() {
    $response = $this->postJson('/api/chat', [
        'content' => 'Some content',
        'messages' => 'not an array'
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['messages']);
});

/**
 * Test that the chat endpoint returns a 422 error when message sender is invalid
 * This test verifies that the endpoint properly validates the 'sender' field in each message
 * and returns an appropriate error response when it's not 'user' or 'assistant'.
 */
test('chat endpoint returns 422 when message sender is invalid', function() {
    $response = $this->postJson('/api/chat', [
        'content' => 'Some content',
        'messages' => [
            [
                'sender' => 'invalid',
                'text' => 'Hello'
            ]
        ]
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['messages.0.sender']);
});

/**
 * Test that the chat endpoint returns a 422 error when message text is empty
 * This test verifies that the endpoint properly validates the 'text' field in each message
 * and returns an appropriate error response when it's empty.
 */
test('chat endpoint returns 422 when message text is empty', function() {
    $response = $this->postJson('/api/chat', [
        'content' => 'Some content',
        'messages' => [
            [
                'sender' => 'user',
                'text' => ''
            ]
        ]
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['messages.0.text']);
});

/**
 * Test that the chat endpoint uses ChatAgent to respond to messages
 * This test verifies that:
 * 1. The endpoint correctly passes the content and messages to the ChatAgent
 * 2. The messages are properly converted from the JSON format to UserMessage and AssistantMessage objects
 * 3. The endpoint returns a streaming response with status 200
 * The test mocks the ChatAgent to avoid making actual API calls and to control the response.
 */
test('chat endpoint uses ChatAgent to respond to messages', function() {
    $generator = function() {
        yield (object)['text' => 'Hello! ', 'finishReason' => null];
        yield (object)['text' => 'I can help explain that in simple terms.', 'finishReason' => 'stop'];
    };

    // Create a mock for PendingRequest
    $pendingRequest = $this->mock(PendingRequest::class);
    $pendingRequest->shouldReceive('asStream')
        ->once()
        ->andReturn($generator());

    // Mock the ChatAgent
    $this->mock(ChatAgent::class, function(MockInterface $mock) use ($pendingRequest) {
        $mock->shouldReceive('chat')
            ->once()
            ->withArgs(function($content, $messages, $settings) {
                // Verify content
                if($content !== 'Some webpage content'){
                    return false;
                }

                // Verify messages
                if(count($messages) !== 2){
                    return false;
                }

                if(!($messages[0] instanceof UserMessage) || $messages[0]->content !== 'What is this page about?'){
                    return false;
                }

                if(!($messages[1] instanceof AssistantMessage) || $messages[1]->content !== 'It seems to be about technology.'){
                    return false;
                }

                // Verify settings is an instance of Settings
                if(!($settings instanceof Settings)){
                    return false;
                }

                return true;
            })
            ->andReturn($pendingRequest);
    });

    // Make the request
    $response = $this->withoutExceptionHandling()
        ->postJson('/api/chat', [
            'content' => 'Some webpage content',
            'messages' => [
                [
                    'sender' => 'user',
                    'text' => 'What is this page about?'
                ],
                [
                    'sender' => 'assistant',
                    'text' => 'It seems to be about technology.'
                ]
            ]
        ]);

    // Assert the response
    $response->assertStatus(200);
});
