const axios = require("axios");
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;



// Haversine fallback
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in km
}


const GoogleMaps = {

  
  // async getDistanceAndTime(origin, destination) {
  //   const modes = ['driving', 'walking'];
  //   const results = {};

  //   await Promise.all(
  //     modes.map(async (mode) => {
  //       try {
  //         const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.long}&destinations=${destination.lat},${destination.long}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;

  //         const response = await axios.get(url);
  //        // console.log("response from google maps..", response);
  //        // console.log("res in google api..", response);
  //         const data = response.data;
  //       //  console.log("data in goodle maps..", data);
  //       console.log("data status..", data.status);
  //       console.log("data rows..", data.rows);
  //         console.log("data rows..",  data.rows?.[0]?.elements?.[0]);
  //         if (
  //           data.status === 'OK' &&
  //           data.rows?.[0]?.elements?.[0]?.status === 'OK'
  //         ) {
  //           const element = data.rows[0].elements[0];
  //           results[mode] = {
  //             distanceInKm: element.distance.value / 1000,
  //             durationInMinutes: element.duration.value / 60,
  //             distanceText: element.distance.text,
  //             durationText: element.duration.text
  //           };
  //           console.log("result..", results);
  //         } else {
  //           results[mode] = { error: `Google API returned status: ${data.status}` };
  //         }
  //       } catch (err) {
  //         results[mode] = { error: `Axios error for mode ${mode}: ${err.message}` };
  //       }
  //     })
  //   );

  //   return results;
  // }


  async  getDistanceAndTime(origin, destination) {
  const modes = ["driving", "walking"];
  const results = {};

  await Promise.all(
    modes.map(async (mode) => {
      try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.long}&destinations=${destination.lat},${destination.long}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
        console.log("Google Maps API called");
        const response = await axios.get(url);
        const data = response.data;
        const element = data.rows?.[0]?.elements?.[0];

        if (data.status === "OK" && element?.status === "OK") {
          results[mode] = {
            distanceInKm: element.distance.value / 1000,
            durationInMinutes: element.duration.value / 60,
            distanceText: element.distance.text,
            durationText: element.duration.text,
            source: "google"
          };
        } else {
          // fallback to haversine
          const straightLineKm = haversineDistance(
            origin.lat,
            origin.long,
            destination.lat,
            destination.long
          );

          results[mode] = {
            distanceInKm: straightLineKm,
            durationInMinutes: null,
            distanceText: `${straightLineKm.toFixed(1)} km (by air)`,
            durationText: "N/A",
            note: "Fallback to straight-line distance (Google returned ZERO_RESULTS)",
            source: "haversine"
          };
        }
      } catch (err) {
        results[mode] = {
          error: `Axios error for mode ${mode}: ${err.message}`,
          source: "error"
        };
      }
    })
  );

  return results;
}
};

module.exports = GoogleMaps;
