jest.setTimeout(10000);

// mock fetch (AuthService might import it)
global.fetch = jest.fn(() =>
  Promise.resolve({
    status: 200,
    json: async () => ({ message: "OTP verified" }),
  })
);

// mock jwt
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "mocked-jwt-token"),
}));

// 🔥 PROPER Doctor model mock
jest.mock("../models/doctorModel", () => {
  return function Doctor(data) {
    return {
      ...data,
      _id: "mock-doctor-id",
      isDeleted: false,
      deletedAt: null,
      deviceTokens: [],

      save: jest.fn().mockResolvedValue(this),

      softDelete: jest.fn().mockImplementation(function () {
        this.isDeleted = true;
        this.deletedAt = new Date();
        return Promise.resolve(this);
      }),
    };
  };
});

const AuthService = require("../services/authService");
const Doctor = require("../models/doctorModel");

describe("Doctor Soft Delete Behaviour (MOCKED MODEL)", () => {
  const doctorPayload = {
    doctorName: "Dr Soft",
    email: "soft@test.com",
    phoneNumber: "9999990000",
    specialization: "Cardiology",
    contactInformation: "Clinic A",
  };

  it("1️⃣ should soft delete a doctor (isDeleted + deletedAt)", async () => {
    const doctor = await AuthService.createUser(doctorPayload);

    await AuthService.deleteUser(doctor._id);

    expect(doctor.isDeleted).toBe(true);
    expect(doctor.deletedAt).toBeInstanceOf(Date);
  });

  it("2️⃣ should allow recreating doctor after soft delete", async () => {
    const doctor1 = await AuthService.createUser(doctorPayload);
    await AuthService.deleteUser(doctor1._id);

    const doctor2 = await AuthService.createUser(doctorPayload);

    expect(doctor2).toBeDefined();
    expect(doctor2.isDeleted).toBe(false);
  });

  it("3️⃣ recreated doctor should be able to login", async () => {
    const doctor = await AuthService.createUser(doctorPayload);

    const login = await AuthService.loginUserWithPhone(
      doctorPayload.phoneNumber,
      "device-token-1"
    );

    expect(login.token).toBe("mocked-jwt-token");
  });
});
