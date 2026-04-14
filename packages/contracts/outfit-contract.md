# Outfit API Contract

Request and response shapes for outfit endpoints.
Source of truth for `@otthomas` building the upload flow UI (Issue #19).

## Base URL

```
http://localhost:8000   (local dev)
https://api.ootd.app   (production — TBD on Railway)
```

All endpoints are prefixed with `/outfits`.

All endpoints require authentication:
```
Authorization: Bearer <access_token>
```

---

## POST /outfits — Create outfit

**Request: `multipart/form-data`**

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | File | ✅ | Photo file. Allowed: jpeg, png, webp, heic. Max 10 MB. |
| `metadata` | string (JSON) | ❌ | JSON-encoded outfit details (see below). Defaults to `{}`. |

`metadata` JSON shape:

```ts
{
  caption?: string
  event_name?: string
  worn_on?: string          // ISO date: "2026-04-13"
  clothing_items?: {
    category: string        // required — e.g. "top", "pants", "shoes"
    brand?: string
    color?: string
    display_order?: number  // 0-based, controls render order
  }[]
}
```

**Example fetch (TypeScript):**

```ts
const form = new FormData()
form.append('image', file)
form.append('metadata', JSON.stringify({
  caption: 'Sunday brunch fit',
  worn_on: '2026-04-13',
  clothing_items: [
    { category: 'top', brand: 'Zara', color: 'white', display_order: 0 },
    { category: 'pants', brand: 'Levis', color: 'blue', display_order: 1 },
  ],
}))

const res = await fetch(`${API_URL}/outfits`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: form,
  // Do NOT set Content-Type — the browser sets it with the boundary automatically
})
```

**Response `201 Created`**

```json
{
  "id": "a1b2c3d4-...",
  "user_id": "e5f6g7h8-...",
  "image_url": "https://ootd-outfits-prod.s3.us-east-1.amazonaws.com/outfits/user_id/uuid.jpg",
  "caption": "Sunday brunch fit",
  "event_name": null,
  "worn_on": "2026-04-13",
  "vibe_check_text": null,
  "vibe_check_tone": null,
  "created_at": "2026-04-13T21:00:00Z",
  "updated_at": "2026-04-13T21:00:00Z",
  "clothing_items": [
    {
      "id": "...",
      "outfit_id": "...",
      "category": "top",
      "brand": "Zara",
      "color": "white",
      "display_order": 0,
      "created_at": "2026-04-13T21:00:00Z"
    },
    {
      "id": "...",
      "outfit_id": "...",
      "category": "pants",
      "brand": "Levis",
      "color": "blue",
      "display_order": 1,
      "created_at": "2026-04-13T21:00:00Z"
    }
  ]
}
```

**Error responses**

| Status | `detail` | Cause |
|---|---|---|
| `401 Unauthorized` | `"Not authenticated."` | Missing or invalid access token |
| `422 Unprocessable Entity` | `"Unsupported file type '...'. Allowed: ..."` | Bad image type |
| `422 Unprocessable Entity` | `"File too large (12.3 MB). Maximum is 10 MB."` | Image too big |
| `422 Unprocessable Entity` | `"Invalid metadata JSON: ..."` | Malformed metadata field |
| `500 Internal Server Error` | `"S3 upload failed: ..."` | Storage failure |

**Notes for Tomi:**
- Do **not** manually set `Content-Type` on the fetch — let the browser set it automatically so the multipart boundary is included correctly
- `clothing_items` can be an empty array or omitted entirely if the user skips that step
- `image_url` is a permanent URL — safe to store and render directly as `<img src={outfit.image_url} />`
- `worn_on` is an ISO date string (`"2026-04-13"`), not a full timestamp
