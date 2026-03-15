# Role-Based Access Control (RBAC)

This document defines the four system roles and their permissions. Use it as the single source of truth for access control and UI behavior.

---

## Admin

**Full access to all system features**, with the exception of certain private user information.

- Enroll students into activities
- Assign officer roles (e.g., President, VP, Secretary)
- Manage all records

---

## Faculty

- View and analyze student profiles
- Enroll students into activities or organizations
- Assign officer positions

---

## Students

- Access their own profile
- Receive enrollment notifications
- View relevant information

---

## Officers

**Students with elevated privileges.** In addition to standard student access:

- Post and manage department merchandise (e.g., ID laces, membership cards, department shirts)
- Accept payments via **GCash** or **cash**
- Students submit proof of payment digitally through the system
- Payment status tracked as:
  - **Paid Online**
  - **Paid (Cash)**

---

## Implementation Notes

- **Backend:** `AdminFacultyOnly` for activities, students, enroll, officer-positions. `OfficerOrAdminFaculty` for merchandise CRUD and order payment-status. Students can GET merchandise and GET/POST merchandise-orders.
- **Officer positions:** Table `officer_positions` (activity_id, user_id, position, assigned_by). Assignable by Admin/Faculty in the Student Profiling Dashboard ("Assign officer positions" section).
- **Merchandise & payments:** Table `merchandise` and `merchandise_orders`. Officers/Admin/Faculty manage items and set order payment status to Pending, Paid Online, or Paid (Cash). Students place orders and may upload proof of payment (image).

### Phase 1: Academic Data (Profile)

- **Stored in:** `student_profiles`: `current_gpa`, `gpa_per_semester` (JSON), `academic_standing` (Regular/Irregular/Probationary), `section`, `failed_units`, `incomplete_grades`, `enrolled_units`, plus existing `course`, `year_level`.
- **Access:** Admin = full read + edit (PUT `/api/students/:id/profile`). Faculty = full read only (students list includes profile). Officers = no access to others’ academic data; own profile read-only. Student = own profile read-only; can edit only non-academic fields (height, weight, interests, skills, notes) via POST `/api/student-profile`.

### Non-academic data (past activity, awards, leadership)

- **Stored in:** `student_non_academic_entries`: type (past_activity, award, leadership), title, description, proof_path, status (pending, approved, rejected), approved_by, flagged_by, endorsed_by.
- **Access:** Admin = full read + edit + approve/reject. Faculty = full read + flag or endorse entries. Officers = read-only view of any student's entries (org context). Student (own) = read + submit/upload; entries require Admin approval before they appear as official.
- **API:** GET/POST `/api/non-academic-entries`, PUT `.../id`, PATCH `.../approve`, `.../reject`, `.../flag`, `.../endorse`. Officers: GET `/api/students/list-for-officers` for student dropdown.

### Skills data (tagged skills, proficiency, portfolio & GitHub)

- **Stored in:** `student_skill_entries`: skill (tag), proficiency_level (Beginner/Intermediate/Advanced/Expert), portfolio_url, github_url, endorsed_by, disputed_by.
- **Access:** Admin = full read + edit (add/edit/delete any student's skills). Faculty = full read + endorse or dispute a skill entry. Officers = no access. Student (own) = full read + self-submit (add/edit/delete own). Student (others) = no access.
- **API:** GET/POST `/api/skill-entries`, PUT/DELETE `.../id`, PATCH `.../endorse`, `.../dispute`. Admin may POST with `user_id` to add a skill for that student.

### Physical data (optional — sports)

- **Stored in:** `student_profiles`: `height_cm`, `weight_kg`, `dominant_hand`, `preferred_position` (optional; most personally sensitive).
- **Access:** Admin = full read + edit. Faculty = read-only **only** when `is_sports_faculty` is true (PE/sports coordinators); otherwise no access. Officers = no access. Student (own) = full read + self-submit/update anytime via POST `/api/student-profile`; entirely optional.
- **Behavior:** Physical fields are stripped from profile in GET `/api/student-profile` for Officers, and from each student’s profile in GET `/api/students` for Officers and for Faculty who are not sports faculty. Students list and edit physical data in My Profile; Admin edits in “Edit profile” modal. Dashboard “Physical” column is shown only to Admin or faculty with `is_sports_faculty`.
- **API:** Admin may PATCH `/api/users/:id` with `{ "is_sports_faculty": true }` to tag a user as sports/PE faculty. Login response includes `is_sports_faculty` for the current user.

### Conduct data (violations & commendations)

- **Stored in:** `student_conduct_entries`: type (violation | commendation), severity (Minor | Major | Grave for violations), title, description, recorded_at, recorded_by; dispute fields: dispute_requested_at, dispute_reason, dispute_status (pending | resolved_upheld | resolved_revised | dismissed), resolved_at, resolved_by, resolve_note.
- **Access:** Admin = full read + full edit + create violation or commendation; resolve dispute. Faculty = read-only (can see violation history to inform enrollment decisions; must pass `user_id` to list that student’s conduct). Officers = no access. Student (own) = read-only; can see own violations and commendations but cannot edit; may submit a formal **dispute request** (PATCH `conduct-entries/:id/dispute`) if they believe a violation record is incorrect. Student (others) = strictly no access.
- **Logic:** Conduct data is highly sensitive. Only Admin creates/edits records. All conduct changes and dispute resolutions are traceable (recorded_by, resolved_by, timestamps). Dispute request creates a pending ticket; Admin resolves with outcome (upheld / revised / dismissed) and optional note.
- **API:** GET `/api/conduct-entries` (Officers 403; Student = own only; Faculty = requires `user_id`; Admin = all or filter by `user_id`). POST `/api/conduct-entries` (Admin only). PUT `/api/conduct-entries/:id` (Admin only). DELETE `/api/conduct-entries/:id` (Admin only). PATCH `/api/conduct-entries/:id/dispute` (Student own only, body: `reason`). PATCH `/api/conduct-entries/:id/resolve-dispute` (Admin only, body: `dispute_status`, `resolve_note`).

### Interest declarations (activities the student is willing to join)

- **Stored in:** `student_interest_declarations`: user_id, activity_id, optional note. Unique per (user_id, activity_id). Links to activities table.
- **Access:** Admin = full read (sees all student interest declarations). Faculty = read-only (used as a signal when selecting students for activities; feeds into smart filter ranking). Officers = no access. Student (own) = full read + full edit — can add, update (note), or retract interest anytime. Student (others) = no access.
- **Logic:** Interest declarations are student-owned and low-sensitivity. No approval flow; students update freely. Purpose is to signal availability and enthusiasm to Admin/Faculty for enrollment and ranking.
- **API:** GET `/api/interest-declarations` (Officers 403; Student = own only; Faculty/Admin = all, optional `user_id` and `activity_id` query params). POST `/api/interest-declarations` (Student only, body: `activity_id`, optional `note`). PUT `/api/interest-declarations/:id` (Student own only, body: `note`). DELETE `/api/interest-declarations/:id` (Student own only). GET `/api/activities/available` (any authenticated user) returns active activities for the interest dropdown. Students list (GET `/api/students`) includes `interest_declarations` with `activity` for Admin/Faculty.
