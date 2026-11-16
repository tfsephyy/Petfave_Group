<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('users', 'pf_accounts');
        Schema::table('pf_accounts', function (Blueprint $table) {
            $table->string('role', 24)->default('owner')->index();
        });
        Schema::create('pf_guardians', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('account_id')->nullable()->unique()->constrained('pf_accounts')->restrictOnDelete();
            $table->string('name', 120);
            $table->string('email', 254);
            $table->string('phone', 40)->nullable();
            $table->string('address', 500)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('archived_at')->nullable()->index();
            $table->timestamps();
        });
        Schema::create('pf_species', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80)->unique();
        });
        Schema::create('pf_breeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('species_id')->constrained('pf_species')->restrictOnDelete();
            $table->string('name', 100);
            $table->unique(['species_id', 'name']);
        });
        Schema::create('pf_animals', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('guardian_id')->constrained('pf_guardians')->restrictOnDelete();
            $table->foreignId('species_id')->constrained('pf_species')->restrictOnDelete();
            $table->foreignId('breed_id')->nullable()->constrained('pf_breeds')->restrictOnDelete();
            $table->string('name', 100);
            $table->string('sex', 12)->default('unknown');
            $table->date('birth_date')->nullable();
            $table->string('microchip', 40)->nullable()->unique();
            $table->decimal('weight_kg', 7, 2)->nullable();
            $table->string('color', 80)->nullable();
            $table->text('notes')->nullable();
            $table->string('photo_path')->nullable();
            $table->timestamp('archived_at')->nullable()->index();
            $table->timestamps();
        });
        Schema::create('pf_booking_resources', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 100)->unique();
            $table->unsignedBigInteger('lock_version')->default(0);
            $table->timestamps();
        });
        Schema::create('pf_bookings', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('animal_id')->constrained('pf_animals')->restrictOnDelete();
            $table->foreignUlid('resource_id')->constrained('pf_booking_resources')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('pf_accounts')->restrictOnDelete();
            $table->string('service', 60);
            $table->string('status', 20)->default('pending');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->text('notes')->nullable();
            $table->string('cancellation_reason', 500)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['resource_id', 'starts_at', 'ends_at']);
            $table->index(['status', 'starts_at']);
        });
        Schema::create('pf_encounters', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('animal_id')->constrained('pf_animals')->restrictOnDelete();
            $table->foreignUlid('booking_id')->nullable()->unique()->constrained('pf_bookings')->restrictOnDelete();
            $table->foreignId('author_id')->constrained('pf_accounts')->restrictOnDelete();
            $table->date('seen_on');
            $table->string('summary', 200);
            $table->text('diagnosis')->nullable();
            $table->text('plan')->nullable();
            $table->decimal('weight_kg', 7, 2)->nullable();
            $table->timestamps();
        });
        Schema::create('pf_clinical_entries', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('animal_id')->constrained('pf_animals')->restrictOnDelete();
            $table->foreignUlid('encounter_id')->nullable()->constrained('pf_encounters')->restrictOnDelete();
            $table->foreignId('author_id')->constrained('pf_accounts')->restrictOnDelete();
            $table->string('kind', 20);
            $table->string('title', 180);
            $table->date('recorded_on');
            $table->date('due_on')->nullable()->index();
            $table->string('dosage', 120)->nullable();
            $table->string('frequency', 120)->nullable();
            $table->string('batch_number', 80)->nullable();
            $table->text('findings')->nullable();
            $table->text('treatment')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->string('void_reason', 500)->nullable();
            $table->timestamps();
        });
        Schema::create('pf_pet_media', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('animal_id')->constrained('pf_animals')->restrictOnDelete();
            $table->foreignId('uploaded_by')->constrained('pf_accounts')->restrictOnDelete();
            $table->string('path');
            $table->string('caption', 180)->nullable();
            $table->timestamps();
        });
        Schema::create('pf_stock_products', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('sku', 60)->unique();
            $table->string('name', 140);
            $table->string('category', 60);
            $table->string('unit', 30)->default('unit');
            $table->text('description')->nullable();
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('reorder_level')->default(5);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->date('expires_on')->nullable();
            $table->timestamp('archived_at')->nullable()->index();
            $table->timestamps();
        });
        Schema::create('pf_stock_movements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained('pf_stock_products')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('pf_accounts')->restrictOnDelete();
            $table->foreignUlid('encounter_id')->nullable()->constrained('pf_encounters')->restrictOnDelete();
            $table->string('type', 20);
            $table->integer('delta');
            $table->unsignedInteger('balance');
            $table->string('reason', 500);
            $table->timestamps();
        });
        Schema::create('pf_audit_events', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('actor_id')->nullable()->constrained('pf_accounts')->restrictOnDelete();
            $table->string('action', 80);
            $table->string('subject_type', 80);
            $table->string('subject_id', 40)->nullable();
            $table->json('changes')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        foreach (['pf_audit_events', 'pf_stock_movements', 'pf_stock_products', 'pf_pet_media', 'pf_clinical_entries', 'pf_encounters', 'pf_bookings', 'pf_booking_resources', 'pf_animals', 'pf_breeds', 'pf_species', 'pf_guardians'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('pf_accounts', fn (Blueprint $table) => $table->dropColumn('role'));
        Schema::rename('pf_accounts', 'users');
    }
};
