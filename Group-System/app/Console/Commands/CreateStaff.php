<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CreateStaff extends Command
{
    protected $signature = 'petfave:staff {email} {--name=Clinic Administrator} {--role=admin}';

    protected $description = 'Create a staff account with a randomly generated password';

    public function handle(): int
    {
        $values = ['email' => Str::lower($this->argument('email')), 'name' => $this->option('name'), 'role' => $this->option('role')];
        $validator = Validator::make($values, [
            'email' => ['required', 'email', 'max:254', 'unique:pf_accounts,email'],
            'name' => ['required', 'string', 'max:120'], 'role' => ['required', Rule::in(['admin', 'veterinarian', 'receptionist'])],
        ]);
        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }
        $password = 'PfA9!'.Str::random(19);
        $user = new User(['name' => $values['name'], 'email' => $values['email'], 'password' => $password]);
        $user->role = $values['role'];
        $user->save();
        $this->info('Staff account created: '.$user->email);
        $this->line('Temporary password: '.$password);
        $this->warn('Save this password securely and change it in Account settings after signing in.');

        return self::SUCCESS;
    }
}
