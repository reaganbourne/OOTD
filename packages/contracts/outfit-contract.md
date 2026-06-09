# Outfit API Contract

Request/response shapes for outfit endpoints. All endpoints are prefixed with `/outfits` and require `Authorization: Bearer <access_token>`.

---

## POST /outfits — Create outfit

**Request: `multipart/form-data`**

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | File | ✅ | Photo file. Allowed: jpeg, png, webp, heic. Max 10 MB. |
| `metadata` | string (JSON) | ❌ | JSON-encoded outfit details. Defaults to `{}`. |

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
    display_order?: number  // 0-based
  }[]
}
```

**Example fetch:**

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

// Do NOT manually set Content-Type — let the browser set it with the multipart boundary
const res = await fetch('/backend/outfits', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: form,
})
```

**Response `201 Created`**

```json
{
  "id": "a1b2c3d4-...",
  "user_id": "e5f6g7h8-...",
  "image_url": "https://s3.amazonaws.com/...",
  "caption": "Sunday brunch fit",
  "event_name": null,
  "worn_on": "2026-04-13",
  "vibe_check_text": "it's giving coastal cowgirl",
  "vibe_check_tone": "casual",
  "created_at": "2026-04-13T21:00:00Z",
  "updated_at": "2026-04-13T21:00:00Z",
  "clothing_items": [
    { "id": "...", "outfit_id": "...", "category": "top", "brand": "Zara", "color": "white", "display_order": 0, "created_at": "..." }
  ]
}
```

**Errors**

| Status | `detail` |
|---|---|
| `401` | `"Not authenticated."` |
| `422` | `"Unsupported file type '...'. Allowed: ..."` |
| `422` | `"File too large (12.3 MB). Maximum is 10 MB."` |
| `422` | `"Invalid metadata JSON: ..."` |
| `500` | `"S3 upload failed: ..."` |
