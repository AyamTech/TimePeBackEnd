// // utils/cacheManager.js

// const cache = new Map();

// function setCache(key, value, ttlMs = 10 * 60 * 1000) {
//   cache.set(key, value);
//   setTimeout(() => cache.delete(key), ttlMs); // Auto-expire
// }

// function getCache(key) {
//   return cache.get(key);
// }

// function hasCache(key) {
//   return cache.has(key);
// }

// function deleteCache(key) {
//   return cache.delete(key);
// }

// module.exports = {
//   setCache,
//   getCache,
//   hasCache,
//   deleteCache,
// };
// utils/cacheManager.js

// const cache = new Map();

// function setCache(key, value, ttlMs = 10 * 60 * 1000) {
//   cache.set(key, value);
//   setTimeout(() => cache.delete(key), ttlMs); // Auto-expire
// }

// function getCache(key) {
//   return cache.get(key);
// }

// function hasCache(key) {
//   return cache.has(key);
// }

// function deleteCache(key) {
//   return cache.delete(key);
// }

// // Additional utility function for distance cache key (from your existing code)
// function getDistanceCacheKey(doctorId, lat, long) {
//   return `distance_${doctorId}_${lat}_${long}`;
// }

// module.exports = {
//   setCache,
//   getCache,
//   hasCache,
//   deleteCache,
//   getDistanceCacheKey, // Add this if not already present
// };

const cache = new Map();

function setCache(key, value, ttlMs = 10 * 60 * 1000) {
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttlMs);
}

function getCache(key) {
  return cache.get(key);
}

function hasCache(key) {
  return cache.has(key);
}

function deleteCache(key) {
  return cache.delete(key);
}

// Enhanced invalidation functions
function invalidateDoctorCache(doctorId, date = null) {
  const today = date || new Date().toISOString().split('T')[0];
  const keysToDelete = [];
  
  // Find all cache keys related to this doctor
  for (const key of cache.keys()) {
    if (key.includes(`doctor_slots_${doctorId}`) || 
        key.includes(`appointments_${doctorId}`) ||
        key.includes(`availability_${doctorId}`) ||
        key.includes(`doctor_basic_${doctorId}`)) {
      keysToDelete.push(key);
    }
  }
  
  // Delete all related cache entries
  keysToDelete.forEach(key => cache.delete(key));
  
  console.log(`Invalidated ${keysToDelete.length} cache entries for doctor ${doctorId}`);
}

function invalidateAppointmentCache(doctorId, appointmentDate) {
  const dateStr = appointmentDate.toISOString().split('T')[0];
  const keysToDelete = [];
  
  for (const key of cache.keys()) {
    if (key.includes(`doctor_slots_${doctorId}_${dateStr}`) || 
        key.includes(`appointments_${doctorId}_${dateStr}`)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  console.log(`Invalidated appointment cache for doctor ${doctorId} on ${dateStr}`);
}

function getDistanceCacheKey(doctorId, lat, long) {
  return `distance_${doctorId}_${lat}_${long}`;
}

module.exports = {
  setCache,
  getCache,
  hasCache,
  deleteCache,
  invalidateDoctorCache,
  invalidateAppointmentCache,
  getDistanceCacheKey,
};