<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

/**
 * Session login for the Clario management portal.
 *
 * Intentionally minimal: no self-registration, no roles, no password reset.
 * Accounts are created by the seeder (see PortalUsersSeeder). Everyone who
 * can log in sees everything.
 *
 * Note this is separate from the unused Inertia auth scaffolding in
 * app/Http/Controllers/Auth — those routes are not registered, and their
 * views no longer exist.
 */
class PortalLoginController extends Controller
{
    public function show(): View|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('portal.dashboard');
        }

        return view('portal.login');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            // Deliberately vague: don't reveal whether the address exists.
            throw ValidationException::withMessages([
                'email' => 'Those details do not match our records.',
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended(route('portal.dashboard'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('portal.login');
    }
}
