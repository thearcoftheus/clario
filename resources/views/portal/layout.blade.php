<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Clario Portal')</title>
    {{-- Static stylesheet, not a Vite asset: the Vite pipeline builds the
         Chrome extension and has no web entry point. See public/portal.css. --}}
    <link rel="stylesheet" href="{{ asset('portal.css') }}?v={{ filemtime(public_path('portal.css')) }}">
</head>
<body>
    @auth
        <header class="masthead">
            <h1>Clario Portal</h1>
            <nav>
                <a href="{{ route('portal.dashboard') }}"
                   @if(request()->routeIs('portal.dashboard')) aria-current="page" @endif>Dashboard</a>
                <a href="{{ route('portal.reports.index') }}"
                   @if(request()->routeIs('portal.reports.*')) aria-current="page" @endif>Reports</a>
            </nav>
            <div class="spacer"></div>
            <span class="small muted">{{ auth()->user()->name }}</span>
            <form method="POST" action="{{ route('portal.logout') }}">
                @csrf
                <button type="submit" class="btn link">Log out</button>
            </form>
        </header>
    @endauth

    <main class="wrap @yield('wrap-class')">
        @yield('content')
    </main>
</body>
</html>
