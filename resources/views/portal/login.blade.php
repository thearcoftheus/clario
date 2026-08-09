@extends('portal.layout')

@section('title', 'Log in — Clario Portal')
@section('wrap-class', 'narrow')

@section('content')
    <div class="card">
        <h2>Clario Portal</h2>

        @if ($errors->any())
            <div class="error-box" role="alert">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="{{ route('portal.login.store') }}">
            @csrf

            <div class="field">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" autocomplete="username"
                       value="{{ old('email') }}" required autofocus>
            </div>

            <div class="field">
                <label for="password">Password</label>
                <input id="password" name="password" type="password"
                       autocomplete="current-password" required>
            </div>

            <div class="field">
                <label class="small" style="font-weight:400">
                    <input type="checkbox" name="remember" value="1" style="width:auto">
                    Stay logged in
                </label>
            </div>

            <button type="submit" class="btn">Log in</button>
        </form>
    </div>

    <p class="small muted">Accounts are created by the Clario team. There is no sign-up.</p>
@endsection
