<?php

namespace Database\Seeders;

use App\Models\Merchandise;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo CCS merchandise with colors and sizes for the student Merch Store carousel.
 */
class MerchandiseCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $createdBy = User::query()->where('email', 'officer@ccs.edu')->value('id')
            ?? User::query()->where('email', 'admin@ccs.edu')->value('id');

        $catalog = [
            [
                'name' => 'CCS Department Shirt',
                'description' => 'Official CCS cotton tee with embroidered college logo—comfortable for campus and org events.',
                'category_label' => 'APPAREL',
                'price' => 350.00,
                'available_colors' => [
                    ['key' => 'orange', 'label' => 'Orange', 'hex' => '#ea580c'],
                    ['key' => 'black', 'label' => 'Black', 'hex' => '#171717'],
                    ['key' => 'white', 'label' => 'White', 'hex' => '#f5f5f4'],
                ],
                'available_sizes' => ['S', 'M', 'L'],
            ],
            [
                'name' => 'CCS Lanyard',
                'description' => 'Reversible woven lanyard with breakaway clip and metal hook—fits school IDs.',
                'category_label' => 'ACCESSORIES',
                'price' => 120.00,
                'available_colors' => [
                    ['key' => 'orange_black', 'label' => 'Orange', 'hex' => '#ea580c'],
                    ['key' => 'navy_gold', 'label' => 'Navy', 'hex' => '#1e3a5f'],
                ],
                'available_sizes' => ['One size'],
            ],
            [
                'name' => 'CCS Zip Hoodie',
                'description' => 'Mid-weight fleece hoodie with front zip, CCS wordmark on chest, and spacious pockets.',
                'category_label' => 'APPAREL',
                'price' => 780.00,
                'available_colors' => [
                    ['key' => 'charcoal', 'label' => 'Charcoal', 'hex' => '#44403c'],
                    ['key' => 'orange', 'label' => 'Orange', 'hex' => '#c2410c'],
                ],
                'available_sizes' => ['S', 'M', 'L'],
            ],
            [
                'name' => 'CCS Canvas Tote Bag',
                'description' => 'Heavy canvas tote with long handles—great for laptops, lab gear, or convention swag.',
                'category_label' => 'ACCESSORIES',
                'price' => 280.00,
                'available_colors' => [
                    ['key' => 'natural', 'label' => 'Natural', 'hex' => '#e7e5e4'],
                    ['key' => 'black', 'label' => 'Black', 'hex' => '#1c1917'],
                ],
                'available_sizes' => ['One size'],
            ],
            [
                'name' => 'CCS ID Holder',
                'description' => 'Rigid card holder with horizontal badge window and detachable neck strap tab.',
                'category_label' => 'ACCESSORIES',
                'price' => 95.00,
                'available_colors' => [
                    ['key' => 'smoke', 'label' => 'Smoke', 'hex' => '#78716c'],
                    ['key' => 'clear', 'label' => 'Clear', 'hex' => '#a8a29e'],
                ],
                'available_sizes' => ['One size'],
            ],
        ];

        foreach ($catalog as $row) {
            Merchandise::query()->updateOrCreate(
                ['name' => $row['name']],
                array_merge($row, [
                    'is_available' => true,
                    'image_path' => null,
                    'created_by' => $createdBy,
                ])
            );
        }
    }
}
