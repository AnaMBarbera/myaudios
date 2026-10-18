# Zona Sonora - Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every collection not explicitly allowed is denied (`allow read, write: if false`).
2. **Educational Content Readability**: Courses, lessons, and audio metadata can be read by authenticated users and students to practice listening.
3. **Admin Privilege**: Ana Barberá (`anabarbera90@gmail.com`) and designated admins have full management access.
4. **User & Student Integrity**: Users cannot tamper with other users' accounts or roles.
5. **ID Poisoning Protection**: All document IDs must conform to `isValidId` (`size() <= 128` and matching `^[a-zA-Z0-9_\-]+$`).
6. **Volumetric Boundaries**: Strings and arrays must have strict length/size limits to prevent denial of wallet attacks.

## 2. The Dirty Dozen Payloads
1. Attempting to write a 1MB string to `courses/test` (Rejected by size validation).
2. Attempting to inject junk characters in path variable `/audios/$$$evil` (Rejected by `isValidId`).
3. An unauthenticated guest attempting to delete a user profile `/users/user_admin_1` (Rejected).
4. A student attempting to elevate role to `admin` in `/users/{studentId}` (Rejected).
5. Attempting to create an audio document without required fields `id`, `title`, `level` (Rejected).
6. Attempting an update to `audios/{audioId}` with unexpected ghost fields like `hacked: true` (Rejected by `affectedKeys`).
7. Attempting to delete a course without admin or teacher privileges (Rejected).
8. Attempting to tamper with system collections like `/admins/{adminId}` directly (Rejected).
9. Attempting to inject script tags into audio title (Rejected by string size/format constraints).
10. Attempting to overwrite existing user passwords or credentials from an unverified session (Rejected).
11. Attempting to flood the lessons collection with unbounded arrays (Rejected by array size limits).
12. Attempting to bypass the default catch-all with nested wildcard collections `/{document=**}` (Rejected).
