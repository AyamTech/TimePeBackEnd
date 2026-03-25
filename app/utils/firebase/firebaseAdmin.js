const admin = require("firebase-admin");
const serviceAccount = require("../../../queue-management-9ae2b-firebase-adminsdk-fbsvc-8a51c227ed.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
