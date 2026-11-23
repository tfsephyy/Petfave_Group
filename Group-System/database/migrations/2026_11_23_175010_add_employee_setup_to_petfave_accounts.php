<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pf_accounts', function (Blueprint $table) {
            $table->boolean('must_change_password')->default(false);
            $table->unsignedInteger('session_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('pf_accounts')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pf_accounts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['must_change_password', 'session_version']);
        });
    }
};
