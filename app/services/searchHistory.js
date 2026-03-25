const Patient = require('../models/patientModel');

class SearchHistoryService {
//   static async saveSearch(patientId, filters) {
//   try {
//     const historyEntry = {
//       keyword: filters.keyword || '',
//       location: filters.location || '',
//       clinicNames: filters.clinicNames || [],
//       specializations: filters.specializations || [],
//       searchedAt: new Date()
//     };

//     await Patient.updateOne(
//       { _id: patientId },
//       {
//         $push: {
//           searchHistory: {
//             $each: [historyEntry],
//             $position: 0
//           }
//         }
//       }
//     );
//   } catch (err) {
//     console.error('Error saving search history:', err);
//   }
// }

// Simpler approach - fetch, modify, and save

static async saveSearch(patientId, filters) {
  try {
    const historyEntry = {
      keyword: filters.keyword || '',
      location: filters.location || '',
      clinicNames: filters.clinicNames || [],
      specializations: filters.specializations || [], // Fixed: was filters.specialization
      searchedAt: new Date()
    };

    // Get current patient data
    const patient = await Patient.findById(patientId).select('searchHistory');
    if (!patient) return;

    let searchHistory = patient.searchHistory || [];

    // Create a comparison function to check if two searches are identical
    const areSearchesIdentical = (search1, search2) => {
      const normalize = (str) => (str || '').toLowerCase().trim();
      const normalizeArray = (arr) => [...(arr || [])].sort().join(',');

      return (
        normalize(search1.keyword) === normalize(search2.keyword) &&
        normalize(search1.location) === normalize(search2.location) &&
        normalizeArray(search1.clinicNames) === normalizeArray(search2.clinicNames) &&
        normalizeArray(search1.specializations) === normalizeArray(search2.specializations)
      );
    };

    // Remove any existing identical searches
    searchHistory = searchHistory.filter(existingSearch => 
      !areSearchesIdentical(existingSearch, historyEntry)
    );

    // Add the new search at the beginning
    searchHistory.unshift(historyEntry);

    // Keep only the last 20 searches
    searchHistory = searchHistory.slice(0, 20);

    // Update the patient document
    await Patient.updateOne(
      { _id: patientId },
      { $set: { searchHistory } }
    );

  } catch (err) {
    console.error('Error saving search history:', err);
  }
}

// Alternative approach using MongoDB aggregation (more efficient for large datasets)
static async saveSearchWithAggregation(patientId, filters) {
  try {
    const historyEntry = {
      keyword: filters.keyword || '',
      location: filters.location || '',
      clinicNames: filters.clinicNames || [],
      specializations: filters.specializations || [],
      searchedAt: new Date()
    };

    // Use findOneAndUpdate with aggregation pipeline
    await Patient.findOneAndUpdate(
      { _id: patientId },
      [
        {
          $set: {
            searchHistory: {
              $slice: [
                {
                  $concatArrays: [
                    [historyEntry],
                    {
                      $filter: {
                        input: { $ifNull: ["$searchHistory", []] },
                        cond: {
                          $not: {
                            $and: [
                              {
                                $eq: [
                                  { $toLower: { $trim: { input: "$$this.keyword" } } },
                                  { $toLower: { $trim: { input: historyEntry.keyword } } }
                                ]
                              },
                              {
                                $eq: [
                                  { $toLower: { $trim: { input: "$$this.location" } } },
                                  { $toLower: { $trim: { input: historyEntry.location } } }
                                ]
                              },
                              {
                                $setEquals: [
                                  { $sortArray: { input: { $ifNull: ["$$this.clinicNames", []] }, sortBy: 1 } },
                                  { $sortArray: { input: historyEntry.clinicNames, sortBy: 1 } }
                                ]
                              },
                              {
                                $setEquals: [
                                  { $sortArray: { input: { $ifNull: ["$$this.specializations", []] }, sortBy: 1 } },
                                  { $sortArray: { input: historyEntry.specializations, sortBy: 1 } }
                                ]
                              }
                            ]
                          }
                        }
                      }
                    }
                  ]
                },
                0,
                20 // Keep only the last 20 searches
              ]
            }
          }
        }
      ]
    );

  } catch (err) {
    console.error('Error saving search history:', err);
  }
}

}

module.exports = SearchHistoryService;
