const express = require("express");
const axios = require("axios");

const router = express.Router();

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

// Search terms that tend to surface real mandis / APMC markets /
// FCI-type procurement points on Google's index. This is an
// approximation — there is no free public API of officially
// DoCA-designated procurement centres, so we search for the kind
// of real, on-the-ground place a farmer would actually go to.
const SEARCH_KEYWORDS = ["krishi upaj mandi", "APMC market", "FCI godown procurement centre"];

const SEARCH_RADIUS_METERS = 40000; // 40km

router.get("/search", async (req, res) => {
  const pincode = (req.query.pincode || "").trim();

  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ success: false, message: "Enter a valid 6-digit PIN code." });
  }

  const key = process.env.GOOGLE_SERVER_KEY;

  if (!key) {
    return res.status(500).json({
      success: false,
      message: "GOOGLE_SERVER_KEY is not set on the server (.env)."
    });
  }

  try {
    // 1) Turn the PIN into coordinates + district/state.
    const geoRes = await axios.get(GEOCODE_URL, {
      params: { address: `${pincode}, India`, key }
    });

    const geoResult = geoRes.data.results && geoRes.data.results[0];

    if (!geoResult) {
      return res.json({ success: true, centres: [] });
    }

    const { lat, lng } = geoResult.geometry.location;

    const components = geoResult.address_components || [];
    const findComponent = (type) => {
      const match = components.find((c) => c.types.includes(type));
      return match ? match.long_name : "";
    };

    const district = findComponent("administrative_area_level_2") || findComponent("locality");
    const state = findComponent("administrative_area_level_1");

    // 2) Search for real nearby mandis / procurement-type places.
    //    Run each keyword and merge, de-duplicating by place_id.
    const searches = await Promise.all(
      SEARCH_KEYWORDS.map((keyword) =>
        axios
          .get(PLACES_URL, {
            params: {
              location: `${lat},${lng}`,
              radius: SEARCH_RADIUS_METERS,
              keyword,
              key
            }
          })
          .then((r) => r.data.results || [])
          .catch(() => [])
      )
    );

    const seen = new Map();

    searches.flat().forEach((place) => {
      if (!seen.has(place.place_id)) {
        seen.set(place.place_id, place);
      }
    });

    const centres = Array.from(seen.values())
      .slice(0, 15)
      .map((place) => ({
        name: place.name,
        address: place.vicinity || "",
        // District/state come from the searched PIN, not a per-place
        // reverse geocode — a reasonable approximation since every
        // result is within ~40km of that PIN's location.
        district,
        state,
        pincode,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng
      }));

    res.json({ success: true, centres });
  } catch (err) {
    console.error("Centre search failed:", err.message);
    res.status(500).json({ success: false, message: "Unable to search centres right now." });
  }
});

module.exports = router;
