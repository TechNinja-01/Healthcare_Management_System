import httpx


async def get_coordinates(address: str):

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": address,
        "format": "json",
        "limit": 1
    }

    headers = {
        "User-Agent": "doctor-appointment-app/1.0"
    }

    async with httpx.AsyncClient() as client:

        response = await client.get(
            url,
            params=params,
            headers=headers
        )

        response.raise_for_status()

        data = response.json()

    if not data:
        return None

    return {
        "latitude": float(data[0]["lat"]),
        "longitude": float(data[0]["lon"])
    }