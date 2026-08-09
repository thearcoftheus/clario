<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeedbackReport extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'browser_id',
        'name',
        'comment',
        'page_url',
        'page_title',
        'original_text',
        'original_truncated',
        'pane',
        'reading_level',
        'level_mode',
        'slide_index',
        'slide_count',
        'simplified_text',
        'truncated',
        'extension_version',
        'user_agent',
    ];

    protected $casts = [
        'truncated' => 'boolean',
        'original_truncated' => 'boolean',
        'slide_index' => 'integer',
        'slide_count' => 'integer',
        'created_at' => 'datetime',
    ];

    /**
     * Friendly labels for the internal pane values. Kept here rather than in
     * the views so the list, detail, and dashboard can't drift apart.
     */
    public const PANE_LABELS = [
        'home' => 'Home',
        'summary' => 'Simple Read',
        'narrate' => 'Listen',
        'avatar' => 'Watch',
        'chat' => 'Ask',
        'settings' => 'Settings',
        'other' => 'Other',
    ];

    /**
     * Mirrors SimplificationLevelDisplayLabels in appStateStore.ts — the
     * stored enum differs from what users are shown.
     */
    public const READING_LEVEL_LABELS = [
        'Easy' => 'Easy',
        'Moderate' => 'Simplified',
        'Challenging' => 'Detailed',
    ];

    public function paneLabel(): string
    {
        return self::PANE_LABELS[$this->pane] ?? $this->pane;
    }

    public function readingLevelLabel(): ?string
    {
        if ($this->reading_level === null) {
            return null;
        }

        return self::READING_LEVEL_LABELS[$this->reading_level] ?? $this->reading_level;
    }

    public function displayName(): string
    {
        return filled($this->name) ? $this->name : 'anonymous';
    }

    /**
     * `original_text` is stored exactly as sent to /api/translate, which means
     * raw innerHTML — see resources/js/helpers/extractContent.ts. That's
     * deliberate: it's the real input, and judging the simplification means
     * seeing what actually went in. It's also near-unreadable, so the portal
     * shows this instead, with the raw markup available behind a toggle.
     *
     * Stripping happens here rather than before saving so the stored record
     * stays faithful.
     */
    public function originalTextAsPlainText(): ?string
    {
        if ($this->original_text === null) {
            return null;
        }

        $text = $this->original_text;

        // strip_tags() removes the <style>/<script> wrapper but KEEPS the CSS
        // or JS inside it, which then reads as article text. Drop these
        // elements whole, contents and all, before anything else.
        //
        // extractContent.ts now removes them at the source too, but reports
        // captured before that still have them, and defending in both places
        // costs nothing.
        $text = preg_replace('/<(script|style)\b[^>]*>.*?<\/\1\s*>/is', ' ', $text);
        // Unclosed <style> at the truncation boundary would otherwise leak
        // its whole tail into the output.
        $text = preg_replace('/<(script|style)\b[^>]*>.*$/is', ' ', $text);
        $text = preg_replace('/<!--.*?-->/s', ' ', $text);

        // strip_tags() would run block elements together ("<p>A</p><p>B</p>"
        // becomes "AB"), so turn structural boundaries into newlines first.
        $text = preg_replace('/<(br|hr)\s*\/?>/i', "\n", $text);
        // Paragraph-level boundaries get a blank line between them...
        $text = preg_replace('/<\/(p|div|section|article|h[1-6]|blockquote|ul|ol|table)\s*>/i', "\n\n", $text);
        // ...but list rows and table rows stay tight, or a bulleted list ends
        // up double-spaced and harder to read than the markup was.
        $text = preg_replace('/<\/(li|tr)\s*>/i', "\n", $text);
        $text = preg_replace('/<li[^>]*>/i', '• ', $text);

        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Tidy up: trailing spaces, runs of blank lines, non-breaking spaces.
        $text = str_replace("\xC2\xA0", ' ', $text);
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $text = preg_replace('/ *\n/', "\n", $text);

        // List rows that held only an icon or a link leave a bare bullet
        // behind — pages of them, on sites with "related content" rails.
        $text = preg_replace('/^\s*•\s*$/m', '', $text);

        // Ad slot markers, matched only as a whole line so an article that
        // discusses advertising keeps its own words.
        //
        // Kept deliberately tiny. It is tempting to grow this into a list of
        // every publisher's furniture ("Share full article", "Order Reprints",
        // bylines, comment counts) but that becomes a per-site rulebase that
        // rots, and over-trimming here would hide real differences between
        // what the API received and what it returned. Anything not matched
        // stays visible, which is the safer failure.
        $text = preg_replace('/^\s*(advertisement|skip advertisement|continue reading the main story)\s*$/im', '', $text);

        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        return trim($text);
    }
}
