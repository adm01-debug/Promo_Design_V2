# API Documentation - Promo Design

## Edge Functions

### `asset-ocr`
Extracts text from images using AI.
- **Method**: POST
- **Auth**: Supabase JWT (Bearer)
- **Body**:
  ```json
  {
    "assetId": "uuid",
    "filePath": "string",
    "mimeType": "string"
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "hasText": true,
    "length": 123
  }
  ```

### `mockup-ai`
Generates mockups from assets.
- **Method**: POST
- **Auth**: Supabase JWT (Bearer)
- **Body**:
  ```json
  {
    "templateId": "uuid",
    "assetId": "uuid",
    "settings": { ... }
  }
  ```

## Database Schema
Most interactions happen directly via Supabase Client (PostgREST).
- **Multi-tenancy**: Strictly enforced via `organization_id` column and RLS.
- **Optimistic Locking**: Use `lock_version` column for updates.
- **Audit**: All changes are tracked in `audit_log` table via triggers.
