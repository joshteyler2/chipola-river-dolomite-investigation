import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, "..");
const assetsDir = path.join(repoDir, "assets");
const sourcesDir = path.join(repoDir, "sources");

const d3Url = "https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js";
const parcelLayer = "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0";
const parcelQuery = new URL(`${parcelLayer}/query`);
parcelQuery.search = new URLSearchParams({
  where: "PARCEL_ID IN ('193N09000000200000','193N09000000200010')",
  outFields: "PARCEL_ID,OWN_NAME,ASMNT_YR",
  returnGeometry: "true",
  outSR: "4326",
  f: "geojson",
}).toString();

const points = {
  d001: [-85.1764777778, 30.6472888889],
  control0: [-85.17699, 30.6479],
  control100: [-85.177888, 30.648325],
  test0: [-85.17644, 30.64642],
};

const bbox = [-85.1810, 30.6448, -85.1735, 30.6502];
const width = 1200;
const height = 920;
const mapBox = { x: 40, y: 108, width: 1120, height: 700 };
const zoom = 16;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function lonToTileX(lon, z) {
  return ((lon + 180) / 360) * 2 ** z;
}

function latToTileY(lat, z) {
  const radians = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * 2 ** z;
}

function tileXToLon(x, z) {
  return (x / 2 ** z) * 360 - 180;
}

function tileYToLat(y, z) {
  return (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;
}

async function getBuffer(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "chipola-river-investigation/1.0 (public-interest research)" },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "chipola-river-investigation/1.0 (public-interest research)" },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

await fs.mkdir(assetsDir, { recursive: true });

const [d3Code, parcels] = await Promise.all([
  fetch(d3Url).then((response) => {
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${d3Url}`);
    return response.text();
  }),
  getJson(parcelQuery),
]);

if (!Array.isArray(parcels.features) || parcels.features.length !== 2) {
  throw new Error(`Expected two FDOR parcel features; received ${parcels.features?.length ?? 0}`);
}

await fs.writeFile(
  path.join(sourcesDir, "28-FDOR-2025-Parcel-Extract.geojson"),
  `${JSON.stringify(parcels, null, 2)}\n`,
  "utf8",
);

const context = vm.createContext({});
vm.runInContext(d3Code, context);
const d3 = context.d3;

const extentGeometry = {
  type: "MultiPoint",
  coordinates: [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[3]],
  ],
};

const projection = d3.geoMercator().fitExtent(
  [[mapBox.x, mapBox.y], [mapBox.x + mapBox.width, mapBox.y + mapBox.height]],
  extentGeometry,
);
const geoPath = d3.geoPath(projection);

const minTileX = Math.floor(lonToTileX(bbox[0], zoom));
const maxTileX = Math.floor(lonToTileX(bbox[2], zoom));
const minTileY = Math.floor(latToTileY(bbox[3], zoom));
const maxTileY = Math.floor(latToTileY(bbox[1], zoom));

const tiles = [];
for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
  for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
    const url = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
    const data = (await getBuffer(url)).toString("base64");
    const northWest = projection([tileXToLon(tileX, zoom), tileYToLat(tileY, zoom)]);
    const southEast = projection([tileXToLon(tileX + 1, zoom), tileYToLat(tileY + 1, zoom)]);
    tiles.push(
      `<image href="data:image/png;base64,${data}" x="${northWest[0].toFixed(2)}" y="${northWest[1].toFixed(2)}" width="${(southEast[0] - northWest[0]).toFixed(2)}" height="${(southEast[1] - northWest[1]).toFixed(2)}" preserveAspectRatio="none"/>`,
    );
  }
}

const parcelPaths = parcels.features.map((feature) => {
  const isBaxter = feature.properties.PARCEL_ID === "193N09000000200010";
  const fill = isBaxter ? "#f59e0b" : "#3b82f6";
  return `<path d="${geoPath(feature)}" fill="${fill}" fill-opacity="0.13" stroke="${fill}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
}).join("\n");

const [d001X, d001Y] = projection(points.d001);
const [control0X, control0Y] = projection(points.control0);
const [control100X, control100Y] = projection(points.control100);
const [test0X, test0Y] = projection(points.test0);

const centerLat = (bbox[1] + bbox[3]) / 2;
const metersPerDegreeLon = 111320 * Math.cos((centerLat * Math.PI) / 180);
const scaleEnd = projection([bbox[0] + 0.00045 + 100 / metersPerDegreeLon, bbox[1] + 0.00034]);
const scaleStart = projection([bbox[0] + 0.00045, bbox[1] + 0.00034]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="map-title map-desc">
  <title id="map-title">2012 FDEP biological control and test sites at Dolomite on the Chipola River</title>
  <desc id="map-desc">The control reach is 83.8 to 177.4 straight-line meters upstream of current Outfall D-001 and lies along the current Baxter trust parcel river frontage. The downstream test endpoint is 96.7 meters from D-001.</desc>
  <defs>
    <clipPath id="map-clip"><rect x="${mapBox.x}" y="${mapBox.y}" width="${mapBox.width}" height="${mapBox.height}" rx="4"/></clipPath>
    <filter id="label-halo" x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" result="dilate" operator="dilate" radius="2"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.95" result="halo"/>
      <feComposite in="halo" in2="dilate" operator="in" result="outline"/>
      <feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <text x="40" y="42" font-family="Arial, sans-serif" font-size="27" font-weight="700" fill="#111827">2012 FDEP bioassessment sites at Dolomite / Chipola River</text>
  <text x="40" y="76" font-family="Arial, sans-serif" font-size="17" fill="#374151">The control was upstream of D-001, but within the mine-side reach—not above the overall operation.</text>
  <g clip-path="url(#map-clip)">
    ${tiles.join("\n")}
    <rect x="${mapBox.x}" y="${mapBox.y}" width="${mapBox.width}" height="${mapBox.height}" fill="#ffffff" fill-opacity="0.06"/>
    ${parcelPaths}
    <line x1="${control0X.toFixed(2)}" y1="${control0Y.toFixed(2)}" x2="${control100X.toFixed(2)}" y2="${control100Y.toFixed(2)}" stroke="#075985" stroke-width="9" stroke-linecap="round"/>
    <line x1="${d001X.toFixed(2)}" y1="${d001Y.toFixed(2)}" x2="${test0X.toFixed(2)}" y2="${test0Y.toFixed(2)}" stroke="#c2410c" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round"/>
    <circle cx="${control0X.toFixed(2)}" cy="${control0Y.toFixed(2)}" r="10" fill="#ffffff" stroke="#075985" stroke-width="5"/>
    <circle cx="${control100X.toFixed(2)}" cy="${control100Y.toFixed(2)}" r="10" fill="#ffffff" stroke="#075985" stroke-width="5"/>
    <path d="M ${d001X.toFixed(2)} ${(d001Y - 13).toFixed(2)} L ${(d001X + 13).toFixed(2)} ${d001Y.toFixed(2)} L ${d001X.toFixed(2)} ${(d001Y + 13).toFixed(2)} L ${(d001X - 13).toFixed(2)} ${d001Y.toFixed(2)} Z" fill="#b91c1c" stroke="#ffffff" stroke-width="3"/>
    <circle cx="${test0X.toFixed(2)}" cy="${test0Y.toFixed(2)}" r="10" fill="#c2410c" stroke="#ffffff" stroke-width="4"/>
  </g>
  <rect x="${mapBox.x}" y="${mapBox.y}" width="${mapBox.width}" height="${mapBox.height}" rx="4" fill="none" stroke="#374151" stroke-width="1.5"/>

  <g font-family="Arial, sans-serif" filter="url(#label-halo)" fill="#111827">
    <text x="${(control100X - 16).toFixed(2)}" y="${(control100Y - 24).toFixed(2)}" text-anchor="end" font-size="17" font-weight="700">Control 100 m</text>
    <text x="${(control100X - 16).toFixed(2)}" y="${(control100Y - 4).toFixed(2)}" text-anchor="end" font-size="14">177.4 m upstream of D-001</text>
    <text x="${(control0X + 18).toFixed(2)}" y="${(control0Y + 2).toFixed(2)}" font-size="17" font-weight="700">Control 0 m</text>
    <text x="${(control0X + 18).toFixed(2)}" y="${(control0Y + 23).toFixed(2)}" font-size="14">83.8 m upstream of D-001</text>
    <text x="${(d001X + 20).toFixed(2)}" y="${(d001Y - 12).toFixed(2)}" font-size="18" font-weight="700">Outfall D-001</text>
    <text x="${(test0X + 18).toFixed(2)}" y="${(test0Y + 4).toFixed(2)}" font-size="17" font-weight="700">Test 0 m</text>
    <text x="${(test0X + 18).toFixed(2)}" y="${(test0Y + 25).toFixed(2)}" font-size="14">96.7 m downstream endpoint</text>
  </g>

  <g transform="translate(${mapBox.x + 22},${mapBox.y + 22})" font-family="Arial, sans-serif">
    <rect width="255" height="100" rx="5" fill="#ffffff" fill-opacity="0.92" stroke="#6b7280"/>
    <rect x="14" y="16" width="25" height="16" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b" stroke-width="2"/>
    <text x="49" y="29" font-size="14" fill="#111827">2025 Baxter trust parcel</text>
    <line x1="14" y1="54" x2="39" y2="54" stroke="#075985" stroke-width="7" stroke-linecap="round"/>
    <text x="49" y="59" font-size="14" fill="#111827">2012 control reach</text>
    <line x1="14" y1="81" x2="39" y2="81" stroke="#c2410c" stroke-width="4" stroke-dasharray="7 5"/>
    <text x="49" y="86" font-size="14" fill="#111827">D-001 to test endpoint</text>
  </g>

  <g transform="translate(${mapBox.x + mapBox.width - 58},${mapBox.y + 24})" font-family="Arial, sans-serif" fill="#111827">
    <path d="M 20 0 L 31 30 L 20 24 L 9 30 Z" fill="#111827"/>
    <text x="20" y="48" text-anchor="middle" font-size="15" font-weight="700">N</text>
  </g>

  <g font-family="Arial, sans-serif" fill="#111827">
    <line x1="${scaleStart[0].toFixed(2)}" y1="${scaleStart[1].toFixed(2)}" x2="${scaleEnd[0].toFixed(2)}" y2="${scaleEnd[1].toFixed(2)}" stroke="#111827" stroke-width="6"/>
    <line x1="${scaleStart[0].toFixed(2)}" y1="${(scaleStart[1] - 7).toFixed(2)}" x2="${scaleStart[0].toFixed(2)}" y2="${(scaleStart[1] + 7).toFixed(2)}" stroke="#111827" stroke-width="3"/>
    <line x1="${scaleEnd[0].toFixed(2)}" y1="${(scaleEnd[1] - 7).toFixed(2)}" x2="${scaleEnd[0].toFixed(2)}" y2="${(scaleEnd[1] + 7).toFixed(2)}" stroke="#111827" stroke-width="3"/>
    <text x="${((scaleStart[0] + scaleEnd[0]) / 2).toFixed(2)}" y="${(scaleStart[1] - 11).toFixed(2)}" text-anchor="middle" font-size="14" font-weight="700" filter="url(#label-halo)">100 m</text>
  </g>

  <text x="40" y="842" font-family="Arial, sans-serif" font-size="14" fill="#374151">Distances are straight-line measurements from the current D-001 permit coordinate; river-channel distances are slightly longer.</text>
  <text x="40" y="868" font-family="Arial, sans-serif" font-size="13" fill="#4b5563">Sources: FDEP corrected FYI Part II field sketches; 2025 FL0101192 permit; 2025 FDOR Cadastral layer. Basemap © OpenStreetMap contributors.</text>
  <text x="40" y="894" font-family="Arial, sans-serif" font-size="13" fill="#4b5563">Current parcel geometry is contextual and does not establish the 2012 title boundary.</text>
</svg>
`;

const outputPath = path.join(assetsDir, "2012-bioassessment-sites-map.svg");
await fs.writeFile(outputPath, svg, "utf8");
console.log(`Wrote ${path.relative(repoDir, outputPath)} with ${tiles.length} embedded OSM tiles.`);
