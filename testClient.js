// testSocketClient.js
const { io } = require("socket.io-client");

const socket = io("http://localhost:4000", {
  auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTE1YjY0ZjJhNmZkMWE4M2FiZWNlNyIsImlhdCI6MTc1OTkwNzUzNSwiZXhwIjoxNzYyNDk5NTM1fQ.EZo4szcQFNwtSG-91zdKSvw2_BxWyoaFgvAg1XPNj8I" },
  query: { clientId: "68515b64f2a6fd1a83abece7", role: "patient" },
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
 socket.emit("get_queue_count", { doctorId: "6867e8ecea035076b3af5988" });
 
  socket.emit("join_doctor_queue", "6867e8ecea035076b3af5988");
  socket.emit("join_appointment", "68e6076b59ee524601ae24e3");



 


  // simulate movement
  socket.emit("location_update", {
    appointmentId: "68e6076b59ee524601ae24e3",
    lat: 22.754219,
    lng: 75.903366,

   
  });
});

socket.on("distance_update", (data) => {
  console.log("Distance Update:", data);
});

socket.on("checkin_request", (data) => {
  console.log("Check-in Prompt:", data);
});
