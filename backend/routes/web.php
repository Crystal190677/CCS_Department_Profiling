<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

Route::get('/{any}', function () {
    $path = public_path('build/index.html');
    if (File::exists($path)) {
        return File::get($path);
    }
    return view('welcome');
})->where('any', '.*');
