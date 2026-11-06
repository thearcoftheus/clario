<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google_cloud_tts' => [
        'api_key' => env('GOOGLE_CLOUD_TTS_API_KEY'),
    ],

    'clario' => [
        'api_key' => env('CLARIO_API_KEY'),
    ],

    'cartesia' => [
        'api_key' => env('CARTESIA_API_KEY'),
    ],

    'simli' => [
        'api_key' => env('SIMLI_API_KEY'),
        // The avatar the Watch pane shows. Fixed server-side so the session
        // route can only ever start this face, whoever calls it.
        'face_id' => env('SIMLI_FACE_ID', '6ebf0aa7-6fed-443d-a4c6-fd1e3080b215'),
    ],

];
