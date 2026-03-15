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
