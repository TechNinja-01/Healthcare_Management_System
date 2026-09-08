import httpx


async def get_coordinates(address: str):
    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": address,
        "format": "json",
        "limit": 1,
    }

    headers = {
        "User-Agent": "DoctorAppointmentApp/1.0"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params=params,
            headers=headers,
            timeout=10,
        )

        response.raise_for_status()

        results = response.json()

    if not results:
        return None

    return {
        "lat": float(results[0]["lat"]),
        "lon": float(results[0]["lon"]),
    }