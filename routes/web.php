<?php

use App\Http\Controllers\Portal\PortalDashboardController;
use App\Http\Controllers\Portal\PortalLoginController;
use App\Http\Controllers\Portal\PortalReportsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Clario Management Portal
|--------------------------------------------------------------------------
|
| A small authenticated web app for the team to review tester feedback and
| keep an eye on provider usage. Server-rendered Blade — the extension owns
| the Vite pipeline, and the portal deliberately stays out of it.
|
| v1 is the feedback module. Structured as a route group so later modules
| (API health, cost) can slot in alongside it.
|
*/

Route::redirect('/', '/portal');

Route::get('/portal/login', [PortalLoginController::class, 'show'])->name('portal.login');
Route::post('/portal/login', [PortalLoginController::class, 'store'])
    ->middleware('throttle:portal-login')
    ->name('portal.login.store');

Route::middleware('auth')->group(function () {
    Route::post('/portal/logout', [PortalLoginController::class, 'destroy'])->name('portal.logout');

    Route::get('/portal', PortalDashboardController::class)->name('portal.dashboard');

    Route::get('/portal/reports', [PortalReportsController::class, 'index'])->name('portal.reports.index');
    // Export must be declared before the {report} route so "export" isn't
    // captured as an ID.
    Route::get('/portal/reports/export', [PortalReportsController::class, 'export'])->name('portal.reports.export');
    Route::get('/portal/reports/{report}', [PortalReportsController::class, 'show'])->name('portal.reports.show');
});
