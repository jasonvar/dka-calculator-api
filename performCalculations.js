const config = require("./config.json");

/**
 * Performs calculations based on patient data to determine protocol parameters.
 * @param {Object} data - Patient data including weight, pH, etc.
 * @returns {Object} - An object containing calculated values and any errors encountered.
 */
const performCalculations = (data) => {
  const errors = [];

  /**
   * Utility function: converts a volume into a rate per unit time.
   * @param {number} volume - The total volume.
   * @param {number} unitTime - The time period over which the volume is administered.
   * @returns {number} - The rate of volume per unit time.
   */
  const volumeToRate = (volume, unitTime) => volume / unitTime;

  /**
   * Determines the severity of the condition based on pH and bicarbonate levels.
   * @returns {string|boolean} - Severity level ("severe", "moderate", "mild") or false if no valid severity is found.
   */
  const severity = () => {
    /**
     * Checks if the given pH and bicarbonate values fall within the range for a specific severity level.
     * @param {Object} levelConfig - Configuration for the severity level.
     * @returns {string|false} - Severity level if matched, otherwise false.
     */
    const checkSeverityLevel = (levelConfig) => {
      const { pHRange, bicarbonateBelow } = levelConfig;

      if (
        (data.pH < pHRange.upper && data.pH >= pHRange.lower) ||
        (data.bicarbonate !== undefined && data.bicarbonate < bicarbonateBelow)
      ) {
        return levelConfig.severity;
      }

      return false;
    };

    // Severity levels configuration
    const severityLevels = [
      { severity: "severe", ...config.severity.severe },
      { severity: "moderate", ...config.severity.moderate },
      { severity: "mild", ...config.severity.mild },
    ];

    // Check each severity level
    for (const levelConfig of severityLevels) {
      const result = checkSeverityLevel(levelConfig);
      if (result) {
        return result;
      }
    }

    // Log error if no valid severity is found
    errors.push(
      `pH of ${data.pH.toFixed(
        2
      )} and bicarbonate of ${data.bicarbonate.toFixed(
        1
      )} mmol/L does not meet the diagnostic threshold for DKA.`
    );
    return false;
  };

  /**
   * Calculates the bolus volume based on patient weight and a given mL/kg rate.
   * @returns {Object} - An object containing the bolus volume, formula, limit, and other details.
   */
  const bolusVolume = () => {
    /**
     * Calculates the uncapped bolus volume based on mL/kg.
     * @param {number} mlsPerKg - The bolus rate in mL/kg.
     * @returns {number} - The uncapped bolus volume in mL.
     */
    const uncapped = (mlsPerKg) => data.weight * mlsPerKg;

    /**
     * Provides the capped bolus volume limit.
     * @returns {number} - The capped bolus volume in mL.
     */
    const capped = () => config.caps.bolus;

    /**
     * Checks if the uncapped bolus volume exceeds the cap.
     * @param {number} mlsPerKg - The bolus rate in mL/kg.
     * @returns {boolean} - True if the uncapped volume exceeds the cap, otherwise false.
     */
    const isCapped = (mlsPerKg) => uncapped(mlsPerKg) > capped();

    /**
     * Provides the bolus volume to use, selecting between capped or uncapped volumes.
     * @param {number} mlsPerKg - The bolus rate in mL/kg.
     * @returns {number} - The bolus volume in mL.
     */
    const val = (mlsPerKg) =>
      isCapped(mlsPerKg) ? capped() : uncapped(mlsPerKg);

    /**
     * Provides the formula used to calculate the bolus volume.
     * @param {number} mlsPerKg - The bolus rate in mL/kg.
     * @returns {string} - The formula for calculating the bolus volume.
     */
    const formula = (mlsPerKg) => `[${mlsPerKg}mL/kg] x [Patient weight (kg)]`;

    /**
     * Provides the bolus volume limit.
     * @returns {string} - The bolus volume limit in mL.
     */
    const limit = () => `${config.caps.bolus}mL`;

    /**
     * Shows the working calculation for the bolus volume.
     * @param {number} mlsPerKg - The bolus rate in mL/kg.
     * @returns {string} - A string showing the detailed calculation.
     */
    const working = (mlsPerKg) =>
      `[${mlsPerKg}mL/kg] x [${data.weight.toFixed(1)}kg] = ${val(
        mlsPerKg
      ).toFixed(0)}mL`;

    return {
      val: val(config.bolusMlsPerKg),
      mlsPerKg: config.bolusMlsPerKg,
      isCapped: isCapped(config.bolusMlsPerKg),
      formula: formula(config.bolusMlsPerKg),
      limit: limit(),
      working: working(config.bolusMlsPerKg),
    };
  };

  /**
   * Calculates the fluid deficit based on the severity of the condition and patient data.
   * @returns {Object} - An object containing deficit percentage, volume, and rate calculations.
   */
  const deficit = () => {
    /**
     * Determines the deficit percentage based on severity.
     * @returns {Object} - An object containing the deficit percentage, formula, and working calculation.
     */
    const percentage = () => {
      /**
       * Gets the deficit percentage based on severity.
       * @returns {number} - The deficit percentage.
       */
      const val = () => {
        switch (severity()) {
          case "severe":
            return config.severity.severe.deficitPercentage;
          case "moderate":
            return config.severity.moderate.deficitPercentage;
          case "mild":
            return config.severity.mild.deficitPercentage;
          default:
            errors.push(
              `Unable to select deficit percentage using severity rating [${severity()}]`
            );
            return 0;
        }
      };

      /**
       * Provides the formula used to determine the deficit percentage.
       * @returns {string} - The formula for determining deficit percentage.
       */
      const formula = () => `[pH] or [bicarbonate] ==> Deficit Percentage`;

      /**
       * Shows the working calculation for the deficit percentage.
       * @returns {string} - A string showing the detailed calculation.
       */
      const working = () => {
        const getBicarbonateText = (bicarbonate) =>
          bicarbonate !== undefined
            ? `${bicarbonate.toFixed(1)} mmol/L`
            : "not provided";

        switch (severity()) {
          case "severe":
            return `[pH ${data.pH.toFixed(
              2
            )}] or [bicarbonate ${getBicarbonateText(data.bicarbonate)}] ==> ${
              config.severity.severe.deficitPercentage
            }%`;
          case "moderate":
            return `[pH ${data.pH.toFixed(
              2
            )}] or [bicarbonate ${getBicarbonateText(data.bicarbonate)}] ==> ${
              config.severity.moderate.deficitPercentage
            }%`;
          case "mild":
            return `[pH ${data.pH.toFixed(
              2
            )}] or [bicarbonate ${getBicarbonateText(data.bicarbonate)}] ==> ${
              config.severity.mild.deficitPercentage
            }%`;
          default:
            return "Unable to determine working formula.";
        }
      };

      return {
        val: val(),
        formula: formula(),
        working: working(),
      };
    };

    /**
     * Calculates the deficit volume based on the deficit percentage and patient weight.
     * @returns {Object} - An object containing deficit volume, formula, limit, working calculation, and capped status.
     */
    const volume = () => {
      /**
       * Calculates the uncapped deficit volume.
       * @returns {number} - The uncapped deficit volume in mL.
       */
      const uncapped = () => percentage().val * data.weight * 10;

      /**
       * Provides the capped deficit volume limit.
       * @returns {number} - The capped deficit volume in mL.
       */
      const capped = () => {
        switch (percentage().val) {
          case 5:
            return config.caps.deficit5;
          case 10:
            return config.caps.deficit10;
          default:
            errors.push("Unable to select deficit volume cap.");
            return 0;
        }
      };

      /**
       * Checks if the uncapped deficit volume exceeds the cap.
       * @returns {boolean} - True if the uncapped volume exceeds the cap, otherwise false.
       */
      const isCapped = () => uncapped() > capped();

      /**
       * Provides the deficit volume to use, selecting between capped or uncapped volumes.
       * @returns {number} - The deficit volume in mL.
       */
      const val = () => (isCapped() ? capped() : uncapped());

      /**
       * Provides the formula used to calculate the deficit volume.
       * @returns {string} - The formula for calculating the deficit volume.
       */
      const formula = () => "[Deficit percentage] x [Patient weight] x 10";

      /**
       * Provides the deficit volume limit based on percentage.
       * @returns {string} - The deficit volume limit in mL.
       */
      const limit = () => {
        switch (percentage().val) {
          case 5:
            return `${config.caps.deficit5} mL (for 5% deficit)`;
          case 10:
            return `${config.caps.deficit10} mL (for 10% deficit)`;
          default:
            return "No limit";
        }
      };

      /**
       * Shows the working calculation for the deficit volume.
       * @returns {string} - A string showing the detailed calculation.
       */
      const working = () =>
        `[${percentage().val}%] x [${data.weight.toFixed(
          1
        )} kg] x 10 = ${uncapped().toFixed(0)} mL ${
          isCapped() ? "(exceeds limit)" : ""
        }`;

      return {
        val: val(),
        formula: formula(),
        limit: limit(),
        working: working(),
        isCapped: isCapped(),
      };
    };

    /**
     * Calculates the deficit volume less the bolus volume.
     * @returns {Object} - An object containing the volume less bolus, bolus to subtract, formula, and working calculation.
     */
    const volumeLessBolus = () => {
      /**
       * Calculates the bolus volume to subtract based on shock presence.
       * @returns {number} - The bolus volume to subtract in mL.
       */
      const bolusToSubtract = () =>
        data.shockPresent ? 0 : bolusVolume(config.bolusMlsPerKg).val;

      /**
       * Provides the deficit volume less bolus.
       * @returns {number} - The volume less bolus in mL.
       */
      const val = () => volume().val - bolusToSubtract();

      /**
       * Provides the formula used to calculate the volume less bolus.
       * @returns {string} - The formula for calculating the volume less bolus.
       */
      const formula = () =>
        "[Deficit volume] - [10mL/kg bolus (only for non-shocked patients)]";

      /**
       * Shows the working calculation for the volume less bolus.
       * @returns {string} - A string showing the detailed calculation.
       */
      const working = () =>
        `[${volume().val.toFixed(0)}mL] - [${bolusToSubtract().toFixed(
          0
        )}mL] = ${val().toFixed(0)}mL`;

      return {
        bolusToSubtract: bolusToSubtract(),
        val: val(),
        formula: formula(),
        working: working(),
      };
    };

    /**
     * Calculates the rate at which the fluid deficit should be replaced.
     * @returns {Object} - An object containing the rate, formula, and working calculation.
     */
    const rate = () => {
      /**
       * Calculates the fluid replacement rate in mL/hour.
       * @returns {number} - The replacement rate in mL/hour.
       */
      const val = () =>
        volumeToRate(volumeLessBolus().val, config.deficitReplacementDuration);

      /**
       * Provides the formula used to calculate the fluid replacement rate.
       * @returns {string} - The formula for calculating the fluid replacement rate.
       */
      const formula = () =>
        "[Deficit volume less bolus] ÷ [deficit replacement duration in hours]";

      /**
       * Shows the working calculation for the fluid replacement rate.
       * @returns {string} - A string showing the detailed calculation.
       */
      const working = () =>
        `[${volumeLessBolus().val.toFixed(0)}mL] ÷ [${
          config.deficitReplacementDuration
        } hours] = ${val().toFixed(1)}mL/hour`;

      return {
        val: val(),
        formula: formula(),
        working: working(),
      };
    };

    return {
      percentage: percentage(),
      volume: volume(),
      volumeLessBolus: volumeLessBolus(),
      rate: rate(),
    };
  };

  /**
   * Calculates the daily maintenance fluid volume and rate based on patient weight.
   * @returns {Object} - An object containing maintenance volume and rate.
   */
  const maintenance = () => {
    /**
     * Calculates the daily maintenance volume based on patient weight.
     * @returns {Object} - An object containing the volume, formula, limit, and working calculation.
     */
    const volume = () => {
      /**
       * Calculates the uncapped maintenance volume.
       * @returns {number} - The uncapped maintenance volume in mL.
       */
      const uncapped = () => {
        if (data.weight < 10) return data.weight * 100;
        if (data.weight < 20) return (data.weight - 10) * 50 + 1000;
        return (data.weight - 20) * 20 + 1500;
      };

      /**
       * Provides the capped maintenance volume limit.
       * @returns {number} - The capped maintenance volume in mL.
       */
      const capped = () => config.caps.maintenance;

      /**
       * Checks if the uncapped maintenance volume exceeds the cap.
       * @returns {boolean} - True if the uncapped volume exceeds the cap, otherwise false.
       */
      const isCapped = () => uncapped() > capped();

      /**
       * Provides the maintenance volume to use, selecting between capped or uncapped volumes.
       * @returns {number} - The maintenance volume in mL.
       */
      const val = () => (isCapped() ? capped() : uncapped());

      /**
       * Provides the formula used to calculate the maintenance volume.
       * @returns {string} - The formula for calculating the maintenance volume.
       */
      const formula = () => {
        if (data.weight < 10) return "[Weight (kg)] x 100";
        if (data.weight < 20) return "1000 + [(Weight (kg) - 10) x 50]";
        return "1500 + [(Weight (kg) - 20) x 20]";
      };

      /**
       * Provides the maintenance volume limit.
       * @returns {string} - The maintenance volume limit in mL.
       */
      const limit = () => `${config.caps.maintenance} mL`;

      /**
       * Shows the working calculation for the maintenance volume.
       * @returns {string} - A string showing the detailed calculation.
       */
      const working = () => {
        if (data.weight < 10)
          return `[${data.weight.toFixed(1)}kg] x 100 = ${uncapped().toFixed(
            0
          )}mL ${isCapped() ? "(exceeds limit)" : ""}`;
        if (data.weight < 20)
          return `1000 + [(${data.weight.toFixed(
            1
          )}kg - 10) x 50] = ${uncapped().toFixed(0)}mL ${
            isCapped() ? "(exceeds limit)" : ""
          }`;
        return `1500 + [(${data.weight.toFixed(
          1
        )}kg - 20) x 20] = ${uncapped().toFixed(0)}mL ${
          isCapped() ? "(exceeds limit)" : ""
        }`;
      };

      return {
        val: val(),
        formula: formula(),
        limit: limit(),
        working: working(),
      };
    };

    /**
     * Calculates the daily maintenance fluid rate.
     * @returns {Object} - An object containing the rate, formula, and working calculation.
     */
    const rate = () => {
      /**
       * Calculates the daily maintenance fluid rate in mL/hour.
       * @returns {number} - The maintenance rate in mL/hour.
       */
      const val = () => volume().val / 24;

      /**
       * Provides the formula used to calculate the daily maintenance fluid rate.
       * @returns {string} - The formula for calculating the maintenance rate.
       */
      const formula = () => "[Daily maintenance volume] ÷ 24 hours";

      /**
       * Shows the working calculation for the daily maintenance fluid rate.
       * @returns {string} - A string showing the detailed calculation.
       */
      const working = () =>
        `[${volume().val.toFixed(0)}mL] ÷ 24 hours = ${val().toFixed(
          1
        )}mL/hour`;

      return {
        val: val(),
        formula: formula(),
        working: working(),
      };
    };

    return {
      volume: volume(),
      rate: rate(),
    };
  };

  /**
   * Calculates the starting fluid rate by summing deficit and maintenance rates.
   * @returns {Object} - An object containing the calculated rate value, formula, and working calculation.
   */
  const startingFluidRate = () => {
    /**
     * Calculates the total starting fluid rate.
     * @returns {number} - The sum of deficit rate and maintenance rate.
     */
    const val = () => deficit().rate.val + maintenance().rate.val;

    /**
     * Provides the formula used to calculate the starting fluid rate.
     * @returns {string} - The formula for calculating the starting fluid rate.
     */
    const formula = () => "[Deficit replacement rate] + [Maintenance rate]";

    /**
     * Shows the working calculation for the starting fluid rate.
     * @returns {string} - A string showing the detailed calculation.
     */
    const working = () =>
      `[${deficit().rate.val.toFixed(
        1
      )}mL/hour] + [${maintenance().rate.val.toFixed(
        1
      )}mL/hour] = ${val().toFixed(1)}mL/hour`;

    return {
      val: val(),
      formula: formula(),
      working: working(),
    };
  };

  /**
   * Calculates the insulin rate based on patient weight and selected insulin rate.
   * @returns {Object} - An object containing the calculated insulin rate, formula, limit, and working calculation.
   */
  const insulinRate = () => {
    /**
     * Calculates the uncapped insulin rate based on patient weight and insulin rate.
     * @returns {number} - The uncapped insulin rate in Units/hour.
     */
    const uncapped = () => data.insulinRate * data.weight;

    /**
     * Determines the capped insulin rate based on the selected insulin rate option.
     * @returns {number} - The capped insulin rate in Units/hour.
     */
    const capped = () => {
      if (data.insulinRate === 0.05) return config.caps.insulin005;
      if (data.insulinRate === 0.1) return config.caps.insulin01;
      errors.push(
        `Unable to select insulin rate capped using insulin rate [${data.insulinRate}].`
      );
    };

    /**
     * Checks if the uncapped insulin rate exceeds the cap.
     * @returns {boolean} - True if the uncapped rate exceeds the cap, otherwise false.
     */
    const isCapped = () => uncapped() > capped();

    /**
     * Provides the insulin rate to use, selecting between capped or uncapped rates.
     * @returns {number} - The insulin rate in Units/hour.
     */
    const val = () => (isCapped() ? capped() : uncapped());

    /**
     * Provides the formula used to calculate the insulin rate.
     * @returns {string} - The formula for calculating the insulin rate.
     */
    const formula = () => "[Insulin rate (Units/kg/hour)] x [Patient weight]";

    /**
     * Provides the limit for the insulin rate based on the selected option.
     * @returns {string} - The insulin rate limit in Units/hour.
     */
    const limit = () => {
      if (data.insulinRate === 0.05)
        return `${config.caps.insulin005} Units/hr`;
      if (data.insulinRate === 0.1) return `${config.caps.insulin01} Units/hr`;
      errors.push(
        `Unable to select insulin rate limit using insulin rate [${data.insulinRate}]`
      );
    };

    /**
     * Shows the working calculation for the insulin rate.
     * @returns {string} - A string showing the detailed calculation.
     */
    const working = () =>
      `[${data.insulinRate} Units/kg/hour] x [${data.weight.toFixed(
        1
      )}kg] = ${val().toFixed(2)} Units/hour`;

    return {
      val: val(),
      isCapped: isCapped(),
      formula: formula(),
      limit: limit(),
      working: working(),
    };
  };

  /**
   * Calculates the glucose bolus volume based on patient weight and a given mL/kg.
   * @returns {Object} - An object containing the calculated volume, formula, limit, and working calculation.
   */
  const glucoseBolusVolume = () => {
    /**
     * Calculates the uncapped glucose bolus volume based on mL/kg.
     * @param {number} mlsPerKg - The glucose bolus rate in mL/kg.
     * @returns {number} - The uncapped glucose bolus volume in mL.
     */
    const uncapped = (mlsPerKg) => data.weight * mlsPerKg;

    /**
     * Provides the capped limit for glucose bolus volume.
     * @returns {number} - The capped glucose bolus volume in mL.
     */
    const capped = () => config.caps.glucoseBolus;

    /**
     * Checks if the uncapped glucose bolus volume exceeds the cap.
     * @param {number} mlsPerKg - The glucose bolus rate in mL/kg.
     * @returns {boolean} - True if the uncapped volume exceeds the cap, otherwise false.
     */
    const isCapped = (mlsPerKg) => uncapped(mlsPerKg) > capped();

    /**
     * Provides the glucose bolus volume to use, selecting between capped or uncapped volumes.
     * @param {number} mlsPerKg - The glucose bolus rate in mL/kg.
     * @returns {number} - The glucose bolus volume in mL.
     */
    const val = (mlsPerKg) =>
      isCapped(mlsPerKg) ? capped() : uncapped(mlsPerKg);

    /**
     * Provides the formula used to calculate the glucose bolus volume.
     * @param {number} mlsPerKg - The glucose bolus rate in mL/kg.
     * @returns {string} - The formula for calculating the glucose bolus volume.
     */
    const formula = (mlsPerKg) => `[${mlsPerKg}mL/kg] x [Patient weight (kg)]`;

    /**
     * Provides the glucose bolus volume limit.
     * @returns {string} - The glucose bolus volume limit in mL.
     */
    const limit = () => `${config.caps.glucoseBolus}mL`;

    /**
     * Shows the working calculation for the glucose bolus volume.
     * @param {number} mlsPerKg - The glucose bolus rate in mL/kg.
     * @returns {string} - A string showing the detailed calculation.
     */
    const working = (mlsPerKg) =>
      `[${mlsPerKg}mL/kg] x [${data.weight.toFixed(1)}kg] = ${val(
        mlsPerKg
      ).toFixed(0)}mL`;

    return {
      val: val(config.glucoseBolusMlsPerKg),
      mlsPerKg: config.glucoseBolusMlsPerKg,
      isCapped: isCapped(config.glucoseBolusMlsPerKg),
      formula: formula(config.glucoseBolusMlsPerKg),
      limit: limit(),
      working: working(config.glucoseBolusMlsPerKg),
    };
  };

  /**
   * Calculates the HHS bolus volume based on patient weight and a given mL/kg.
   * @returns {Object} - An object containing the calculated volume, formula, limit, and working calculation.
   */
  const hhsBolusVolume = () => {
    /**
     * Calculates the uncapped HHS bolus volume based on mL/kg.
     * @param {number} mlsPerKg - The HHS bolus rate in mL/kg.
     * @returns {number} - The uncapped HHS bolus volume in mL.
     */
    const uncapped = (mlsPerKg) => data.weight * mlsPerKg;

    /**
     * Provides the capped limit for HHS bolus volume.
     * @returns {number} - The capped HHS bolus volume in mL.
     */
    const capped = () => config.caps.hhsBolus;

    /**
     * Checks if the uncapped HHS bolus volume exceeds the cap.
     * @param {number} mlsPerKg - The HHS bolus rate in mL/kg.
     * @returns {boolean} - True if the uncapped volume exceeds the cap, otherwise false.
     */
    const isCapped = (mlsPerKg) => uncapped(mlsPerKg) > capped();

    /**
     * Provides the HHS bolus volume to use, selecting between capped or uncapped volumes.
     * @param {number} mlsPerKg - The HHS bolus rate in mL/kg.
     * @returns {number} - The HHS bolus volume in mL.
     */
    const val = (mlsPerKg) =>
      isCapped(mlsPerKg) ? capped() : uncapped(mlsPerKg);

    /**
     * Provides the formula used to calculate the HHS bolus volume.
     * @param {number} mlsPerKg - The HHS bolus rate in mL/kg.
     * @returns {string} - The formula for calculating the HHS bolus volume.
     */
    const formula = (mlsPerKg) => `[${mlsPerKg}mL/kg] x [Patient weight (kg)]`;

    /**
     * Provides the HHS bolus volume limit.
     * @returns {string} - The HHS bolus volume limit in mL.
     */
    const limit = () => `${config.caps.hhsBolus}mL`;

    /**
     * Shows the working calculation for the HHS bolus volume.
     * @param {number} mlsPerKg - The HHS bolus rate in mL/kg.
     * @returns {string} - A string showing the detailed calculation.
     */
    const working = (mlsPerKg) =>
      `[${mlsPerKg}mL/kg] x [${data.weight.toFixed(1)}kg] = ${val(
        mlsPerKg
      ).toFixed(0)}mL`;

    return {
      val: val(config.hhsBolusMlsPerKg),
      mlsPerKg: config.hhsBolusMlsPerKg,
      isCapped: isCapped(config.hhsBolusMlsPerKg),
      formula: formula(config.hhsBolusMlsPerKg),
      limit: limit(),
      working: working(config.hhsBolusMlsPerKg),
    };
  };

  return {
    severity: severity(),
    bolusVolume: bolusVolume(),
    deficit: deficit(),
    maintenance: maintenance(),
    startingFluidRate: startingFluidRate(),
    insulinRate: insulinRate(),
    glucoseBolusVolume: glucoseBolusVolume(),
    hhsBolusVolume: hhsBolusVolume(),
    errors: errors,
  };
};

module.exports = { performCalculations };
