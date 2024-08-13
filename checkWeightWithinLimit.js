const config = require("./config.json");

/**
 * Checks if the patient's weight is within the acceptable limits based on their sex and age.
 * If the `weightLimitOverride` flag is set, the function will skip the checks and return `true` (Hard maximum is already checked in validateAndSanitize).
 *
 * @param {Object} data - The input data object containing patient information and configuration settings.
 * @param {boolean} data.weightLimitOverride - Flag to bypass weight limit checks.
 * @param {string} data.patientSex - The sex of the patient, used to determine weight limits.
 * @param {number} data.patientAgeMonths - The age of the patient in months.
 * @param {number} data.patientAge - The age of the patient in years.
 * @param {number} data.weight - The weight of the patient.
 * @returns {Object} An object containing the result of the check.
 * @returns {boolean} returns.pass - Indicates if the weight is within the limit.
 * @returns {string} returns.error - Error message if the check fails.
 */
function checkWeightWithinLimit(data) {
  try {
    //skip checks if weightLimitOverride is true
    if (data.weightLimitOverride)
      return {
        pass: true,
      };

    const limit = {
      /**
       * Returns the lower weight limit based on patient sex and age in months.
       * @returns {number} - The lower weight limit.
       */
      lower() {
        return config.weightLimits[data.patientSex].lower[
          data.patientAgeMonths
        ];
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
      throw `Patient age in months: [${data.patientAgeMonths}] does not match patient age in years: [${data.patientAge}]`;

    const weight = data.weight;
    //check the weight is within range
    if (weight < limit.lower() || weight > limit.upper()) {
      throw `If weight limit override is not selected, weight must be within 2 standard deviations of the mean for age (upper limit ${
        config.weightLimits.max
      }kg) (range ${limit.lower()}kg to ${limit.upper()}kg for ${
        data.patientSex
      } patient aged ${data.patientAge} years and ${
        data.patientAgeMonths - data.patientAge * 12
      } months).`;
    }
    return {
      pass: true,
    };
  } catch (error) {
    return {
      pass: false,
      error: error.toString(),
    };
  }
}

module.exports = { checkWeightWithinLimit };
