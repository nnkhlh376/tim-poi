const map = L.map('map').setView([16.0, 108.0], 6); // Khởi tạo bản đồ với vị trí trung tâm VN
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let locationMarker = null;
let poiMarkers = [];

async function geocode(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&countrycodes=vn&limit=1`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } else {
    throw new Error('Không tìm thấy địa điểm');
  }
}

async function fetchPOIs(lat, lon, radius = 1000, maxResults = 5) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      node["amenity"="cafe"](around:${radius},${lat},${lon});
      node["tourism"="museum"](around:${radius},${lat},${lon});
    );
    out body ${maxResults};
  `;
  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  const resp = await fetch(url);
  const data = await resp.json();
  return data.elements.map(el => ({
    lat: el.lat,
    lon: el.lon,
    name: el.tags.name || 'Không tên',
    type: el.tags.amenity || el.tags.tourism || 'unknown'
  })).slice(0, maxResults);
}

document.getElementById('searchBtn').addEventListener('click', async () => {
  const input = document.getElementById('placeInput');
  const place = input.value.trim();
  
  // Kiểm tra input rỗng
  if (!place) {
    alert('Xin nhập tên địa điểm');
    return;
  }
  
  const btn = document.getElementById('searchBtn');
  btn.textContent = 'Đang tìm...';
  btn.disabled = true;
  
  try {
    const { lat, lon } = await geocode(place);
    if (locationMarker) { map.removeLayer(locationMarker); }
    locationMarker = L.marker([lat, lon]).addTo(map).bindPopup(`Vị trí: ${place}`).openPopup();
    map.setView([lat, lon], 14);

    poiMarkers.forEach(m => map.removeLayer(m));
    poiMarkers = [];

    const pois = await fetchPOIs(lat, lon, 2000, 5);
    pois.forEach(poi => {
      const m = L.marker([poi.lat, poi.lon]).addTo(map)
        .bindPopup(`${poi.name} <br> Type: ${poi.type}`);
      poiMarkers.push(m);
    });
  } catch (err) {
    console.error(err);
    alert('Lỗi: ' + err.message);
  } finally {
    btn.textContent = 'Tìm';
    btn.disabled = false;
  }
});
