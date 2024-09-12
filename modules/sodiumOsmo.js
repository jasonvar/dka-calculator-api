/**
 * Calculates the corrected sodium level based on sodium and glucose levels.
 * This is used to adjust sodium concentration when glucose is elevated.
 *
 * @param {number} sodium - The current sodium level (mmol/L).
 * @param {number} glucose - The current glucose level (mmol/L).
 * @returns {number} The corrected sodium level (mmol/L).
 */
function calculateCorrectedSodium(sodium, glucose) {
  return sodium + (glucose - 5.6) / 3.5;
}

/**
 * Calculates the effective osmolality based on sodium and glucose levels.
 * Effective osmolality is an important measurement for assessing hydration status.
 *
 * @param {number} sodium - The sodium level (mmol/L).
 * @param {number} glucose - The glucose level (mmol/L).
 * @returns {number} The effective osmolality (mOsm/kg).
 */
function calculateEffectiveOsmolality(sodium, glucose) {
  return 2 * sodium + glucose;
}

// Exporting the functions
module.exports = { calculateCorrectedSodium, calculateEffectiveOsmolality };
