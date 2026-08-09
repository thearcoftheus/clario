<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Why a request was made, when the client can say.
     *
     * `translate` fires automatically whenever the sidebar opens on an
     * article, and again whenever a content-affecting setting changes. Without
     * this column the two are indistinguishable, and the raw count reads like
     * enthusiasm for Simple Read when most of it is prefetch.
     *
     * Nullable on purpose: rows recorded before this column existed, and every
     * route that doesn't send a trigger, stay null.
     */
    public function up(): void
    {
        Schema::table('api_metrics', function (Blueprint $table) {
            $table->string('trigger', 20)->nullable()->after('route_name');
        });
    }

    public function down(): void
    {
        Schema::table('api_metrics', function (Blueprint $table) {
            $table->dropColumn('trigger');
        });
    }
};
