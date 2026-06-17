import requests

SUPABASE_URL = "https://niniwgiytyqvdqejigxg.supabase.co"
SUPABASE_KEY = "sb_publishable_GwrNUpIuWzdg1oswOY5HzA_mKWqhd6y"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

img_path = "img/close-up-woman-meditating-lotus-position-sunset.jpg"
storage_filename = "kunsten-at-saenke-tempoet-card.jpg"

with open(img_path, "rb") as f:
    upload_res = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/retreat-images/{storage_filename}",
        headers={**headers, "Content-Type": "image/jpeg"},
        data=f.read()
    )

print("Upload status:", upload_res.status_code, upload_res.text[:200])

image_url = f"{SUPABASE_URL}/storage/v1/object/public/retreat-images/{storage_filename}"

insert_res = requests.post(
    f"{SUPABASE_URL}/rest/v1/retreats",
    headers={**headers, "Content-Type": "application/json", "Prefer": "return=representation"},
    json={
        "slug": "kunsten-at-saenke-tempoet",
        "title": "Kunsten at sænke tempoet",
        "subtitle": "Wellness",
        "description": "Et luksuriøst wellness-retreat med fokus på ro, healing og restitution.",
        "arrival_date": "2026-09-14",
        "departure_date": "2026-09-21",
        "price": 14900,
        "deposit_pct": 0.3,
        "card_image": image_url,
        "hero_image": image_url,
        "active": True
    }
)

print("Insert status:", insert_res.status_code, insert_res.text[:300])
