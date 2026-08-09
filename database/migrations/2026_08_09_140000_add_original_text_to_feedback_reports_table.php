<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The article text as extracted from the page — what was sent to
     * /api/translate — alongside the simplified result we already store.
     *
     * Kept so the pair can be read side by side later to judge how well the
     * simplification is doing on real examples. `page_url` is not a substitute:
     * news sites rewrite and re-slug articles, so re-fetching the URL months
     * later can return different text, or nothing.
     */
    public function up(): void
    {
        Schema::table('feedback_reports', function (Blueprint $table) {
            $table->text('original_text')->nullable()->after('page_title');
            $table->boolean('original_truncated')->default(false)->after('original_text');
        });
    }

    public function down(): void
    {
        Schema::table('feedback_reports', function (Blueprint $table) {
            $table->dropColumn(['original_text', 'original_truncated']);
        });
    }
};
