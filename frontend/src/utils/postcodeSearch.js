export async function lookupPostcode(postcode) {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()
  const res = await fetch(`https://api.postcodes.io/postcodes/${cleaned}`)
  if (!res.ok) throw new Error('Postcode not found')
  const data = await res.json()
  if (data.status !== 200) throw new Error('Postcode not found')
  return {
    lat: data.result.latitude,
    lng: data.result.longitude,
    region: data.result.region,
  }
}

export function findNearestTrust(lat, lng, trusts) {
  let nearest = null
  let minDist = Infinity

  for (const trust of trusts) {
    const dist = haversine(lat, lng, trust.lat, trust.lng)
    if (dist < minDist) {
      minDist = dist
      nearest = trust
    }
  }

  return nearest
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg) { return deg * Math.PI / 180 }
