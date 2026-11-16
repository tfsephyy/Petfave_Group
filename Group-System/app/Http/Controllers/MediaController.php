<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MediaController extends Controller
{
    public function photo(Animal $animal): BinaryFileResponse
    {
        $this->authorize('view', $animal);
        abort_unless($animal->photo_path && Storage::disk('local')->exists($animal->photo_path), 404);

        return response()->file(Storage::disk('local')->path($animal->photo_path), ['Cache-Control' => 'private, no-store']);
    }

    public function updatePhoto(Request $request, Animal $animal): JsonResponse
    {
        $this->authorize('update', $animal);
        $request->validate(['photo' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5120), 'dimensions:max_width=8000,max_height=8000']]);
        $path = $request->file('photo')->store('animals/'.$animal->id, 'local');
        abort_unless($path, 500, 'The photo could not be stored.');
        $old = $animal->photo_path;
        try {
            DB::transaction(function () use ($animal, $path) {
                $animal->update(['photo_path' => $path]);
                Audit::record('animal.photo_updated', $animal);
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }
        if ($old) {
            Storage::disk('local')->delete($old);
        }

        return response()->json($animal);
    }

    public function store(Request $request, Animal $animal): JsonResponse
    {
        $this->authorize('update', $animal);
        $request->validate(['photo' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5120), 'dimensions:max_width=8000,max_height=8000'], 'caption' => ['nullable', 'string', 'max:180']]);
        $path = $request->file('photo')->store('animals/'.$animal->id.'/gallery', 'local');
        abort_unless($path, 500, 'The image could not be stored.');
        try {
            $media = DB::transaction(function () use ($animal, $request, $path) {
                $media = $animal->media()->create(['path' => $path, 'caption' => $request->input('caption'), 'uploaded_by' => $request->user()->id]);
                Audit::record('gallery.uploaded', $media);

                return $media;
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json($media, 201);
    }

    public function file(Animal $animal, string $media): BinaryFileResponse
    {
        $this->authorize('view', $animal);
        $image = $animal->media()->findOrFail($media);
        abort_unless(Storage::disk('local')->exists($image->path), 404);

        return response()->file(Storage::disk('local')->path($image->path), ['Cache-Control' => 'private, no-store']);
    }

    public function destroy(Animal $animal, string $media): JsonResponse
    {
        $this->authorize('update', $animal);
        $image = $animal->media()->findOrFail($media);
        DB::transaction(function () use ($image) {
            Audit::record('gallery.removed', $image);
            $image->delete();
        });
        Storage::disk('local')->delete($image->path);

        return response()->json([], 200);
    }
}
