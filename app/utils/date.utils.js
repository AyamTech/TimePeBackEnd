const { DateTime } = require("luxon");

const getTodayRange = () => {
  const now = DateTime.local();
  return {
    startOfDay: now.startOf("day").toJSDate(),
    endOfDay: now.endOf("day").toJSDate()
  };
};

module.exports = { getTodayRange };
