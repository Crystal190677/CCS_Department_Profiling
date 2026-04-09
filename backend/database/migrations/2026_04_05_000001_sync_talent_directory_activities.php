<?php

use App\Models\Activity;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Canonical activities for Talent Directory filter, assign-to-activity, and related flows.
     * Removes any activities not in this list (cascades enrollments, interests tied to those IDs, etc.).
     */
    public function up(): void
    {
        $definitions = [
            ['name' => 'Programming', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Mr. and Ms. Sportsfest', 'type' => 'event', 'criteria' => []],
            ['name' => 'Cheerdance', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Basketball', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Volleyball', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Badminton', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Table Tennis', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Track and Field', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Mobile Competition', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Spelling Bee', 'type' => 'event', 'criteria' => []],
            ['name' => 'General Knowledge Quiz', 'type' => 'event', 'criteria' => []],
            ['name' => 'Science Quiz Bowl', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Chess Club', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Esports / Online Games', 'type' => 'activity', 'criteria' => []],
        ];

        $names = array_column($definitions, 'name');

        Activity::whereNotIn('name', $names)->delete();

        foreach ($definitions as $row) {
            Activity::updateOrCreate(
                ['name' => $row['name']],
                [
                    'type' => $row['type'],
                    'criteria' => $row['criteria'],
                    'is_active' => true,
                ]
            );
        }
    }

    public function down(): void
    {
        // Non-reversible: removed activities and dependent rows are not restored.
    }
};
