<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * User-initiated feedback reports submitted from the extension's
     * "Give feedback" modal. Distinct from the local-only behavioral
     * telemetry (see CLAUDE.md) — everything here was typed or explicitly
     * triggered by the user, with disclosure shown in the modal.
     */
    public function up(): void
    {
        Schema::create('feedback_reports', function (Blueprint $table) {
            $table->id();

            // Anonymous per-browser-profile UUID. Lets us see that several
            // reports came from the same browser without knowing whose.
            $table->string('browser_id', 36);

            $table->string('name', 200)->nullable();
            $table->text('comment');

            $table->text('page_url');
            $table->text('page_title')->nullable();

            // Internal View value ('home' | 'summary' | 'chat' | 'narrate' |
            // 'avatar') plus 'settings' / 'other'. Stored raw and mapped to
            // friendly labels in the portal, so renaming a pane in the UI
            // never silently rewrites history.
            $table->string('pane', 20);

            // 'Easy' | 'Moderate' | 'Challenging' — the stored enum, not the
            // display label. Nullable because settings may not have loaded.
            $table->string('reading_level', 20)->nullable();
            // 'manual' | 'auto', from settings.adaptiveDifficulty.
            $table->string('level_mode', 20)->nullable();

            // 1-based slide the user was on, when the pane paginates.
            $table->integer('slide_index')->nullable();
            $table->integer('slide_count')->nullable();

            // What Clario was actually showing — the AI-simplified markdown,
            // all slides. Null on panes with no simplified content.
            //
            // mediumText, NOT text: on MySQL, text() is TEXT and caps at
            // 65,535 bytes, while these snapshots are capped at 100 KB
            // (FeedbackReportRequest::MAX_SIMPLIFIED_TEXT_BYTES). With strict
            // mode on — Cloudways default — a large report would error
            // outright; without it, it would truncate silently. SQLite has no
            // such limit, so this difference is invisible in local dev.
            $table->mediumText('simplified_text')->nullable();
            $table->boolean('truncated')->default(false);

            $table->string('extension_version', 20)->nullable();
            $table->string('user_agent', 500)->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index('browser_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_reports');
    }
};
