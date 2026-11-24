<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_separate_backend_shows_the_laravel_welcome_page(): void
    {
        config(['app.serve_frontend' => false]);

        $this->get('/')->assertOk()->assertViewIs('welcome');
    }

    public function test_separate_backend_redirects_login_to_the_frontend(): void
    {
        config(['app.serve_frontend' => false, 'app.frontend_url' => 'http://localhost:3000']);

        $this->get('/login')->assertRedirect('http://localhost:3000/login');
    }
}
