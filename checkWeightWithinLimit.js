const config = require("./config.json");

/**
 * Validates the weight.
 * @returns {boolean} - True if the weight is valid.
 * @throws {error} - if weight is outside limits without override
 */
function checkWeightWithinLimit(data) {
  //skip checks if weightLimitOverride is true
  if (data.weightLimitOverride) return true;

  const limit = {
    /**
     * Returns the lower weight limit based on patient sex and age in months.
     * @returns {number} - The lower weight limit.
     */
    lower() {
      return config.weightLimits[data.patientSex].lower[data.patientAgeMonths];
    },
    /**
     * Returns the upper weight limit based on patient sex and age in months, capped by the maximum allowed weight.
     * @returns {number} - The upper weight limit.
     */
    upper() {
      let upper =
        config.weightLimits[data.patientSex].upper[data.patientAgeMonths];
      if (upper > config.weightLimits.max) upper = config.weightLimits.max;
      return upper;
    },
  };

  // Calculate the age in years from patientAgeMonths, rounded down
  const ageInYearsFromAgeMonths = Math.floor(data.patientAgeMonths / 12);

  // Check if the calculated age in years matches the provided patientAge
  if (ageInYearsFromAgeMonths !== data.patientAge)
    throw new Error(
      `Patient age in months: [${data.patientAgeMonths}] does not match patient age in years: [${data.patientAge}]`
    );

  const weight = data.weight;
  //check the weight is within range
  if (weight < limit.lower() || weight > limit.upper()) {
    throw new Error(
      `If weight limit override is not selected, weight must be within 2 standard deviations of the mean for age (upper limit ${
        config.weightLimits.max
      }kg) (range ${limit.lower()}kg to ${limit.upper()}kg for ${
        data.patientSex
      } patient aged ${data.patientAge} years and ${
        data.patientAgeMonths - data.patientAge * 12
      } months).`
    );
  }
  return true;
}

module.exports = { checkWeightWithinLimit };
