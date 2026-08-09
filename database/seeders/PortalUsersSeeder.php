<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates the portal accounts. There is no self-registration, so this is the
 * only way an account comes into existence.
 *
 * Run with:  php artisan db:seed --class=PortalUsersSeeder
 *
 * Each account gets a random password, printed once to the console. Copy them
 * out and share them over a private channel — they are not recoverable, and
 * re-running the seeder leaves existing accounts alone.
 *
 * To reset one:  php artisan db:seed --class=PortalUsersSeeder --force
 * (existing users are skipped; delete the row first to re-issue a password)
 */
class PortalUsersSeeder extends Seeder
{
    // TODO(ben): replace the two CHANGEME addresses with Katy's and Cesar's
    // real email before seeding on production. They are placeholders — nobody
    // has confirmed what those addresses actually are.
    private const ACCOUNTS = [
        ['name' => 'Ben Freda', 'email' => 'ben@bfcdigital.com'],
        ['name' => 'Katy', 'email' => 'CHANGEME-katy@example.com'],
        ['name' => 'Cesar', 'email' => 'CHANGEME-cesar@example.com'],
    ];

    public function run(): void
    {
        foreach (self::ACCOUNTS as $account) {
            if (str_starts_with($account['email'], 'CHANGEME-')) {
                $this->command?->warn("  skipped placeholder address for {$account['name']} — edit PortalUsersSeeder first");
                continue;
            }

            if (User::where('email', $account['email'])->exists()) {
                $this->command?->line("  skipped (already exists): {$account['email']}");
                continue;
            }

            $password = Str::password(16);

            User::create([
                'name' => $account['name'],
                'email' => $account['email'],
                'password' => Hash::make($password),
            ]);

            $this->command?->line("  created: {$account['email']}  password: {$password}");
        }

        $this->command?->newLine();
        $this->command?->warn('Copy these passwords now — they are not stored anywhere in readable form.');
    }
}
