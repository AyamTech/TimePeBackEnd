module.exports = jest.fn(() =>
  Promise.resolve({
    status: 200,
    json: () =>
      Promise.resolve({
        message: "OTP verified successfully",
      }),
  })
);
