const config = require("./config.json");

//utilities
//takes a volume and divides by number of unitTime over which it should run to give a rate in volumeUnit/unitTime
const volumeToRate = ($volume, $unitTime) => {
  return $volume / $unitTime;
};

const performCalculations = (data) => {
  const errors = [];
  //check ketones meet diagnostic threshold for DKA
  if (data.ketones !== undefined) {
    if (data.ketones < config.minimumKetones) {
      errors.push(
        `Ketones of ${data.ketones.toFixed(
          1
        )} mmol/L are below the diagnostic threshold for DKA of ${
          config.minimumKetones
        } mmol/L.`
      );
    }
  }

  const severity = () => {
    if (
      data.pH < config.severity.severe.pHRange.upper &&
      data.pH >= config.severity.severe.pHRange.lower
    ) {
      return "severe";
    } else if (
      data.bicarbonate !== undefined &&
      data.bicarbonate < config.severity.severe.bicarbonateBelow
    ) {
      return "severe";
    } else if (
      data.pH < config.severity.moderate.pHRange.upper &&
      data.pH >= config.severity.moderate.pHRange.lower
    ) {
      return "moderate";
    } else if (
      data.bicarbonate !== undefined &&
      data.bicarbonate < config.severity.moderate.bicarbonateBelow
    ) {
      return "moderate";
    } else if (
      data.pH <= config.severity.mild.pHRange.upper &&
      data.pH >= config.severity.mild.pHRange.lower
    ) {
      return "mild";
    } else if (
      data.bicarbonate !== undefined &&
      data.bicarbonate < config.severity.mild.bicarbonateBelow
    ) {
      return "mild";
    } else {
      errors.push(
        `pH of ${data.pH.toFixed(
          2
        )} and bicarbonate of ${data.bicarbonate.toFixed(
          1
        )} mmol/L does not meet the diagnostic threshold for DKA.`
      );
      return false;
    }
  };

  const bolusVolume = () => {
    const uncapped = (mlsPerKg) => {
      // Returns literal bolus volume based on given mL/kg for given patient weight
      return data.weight * mlsPerKg;
    };

    const capped = () => {
      // Returns the set limit of the bolus volume
      return config.caps.bolus;
    };

    const isCapped = (mlsPerKg) => {
      // Returns true if the uncapped bolus volume exceeds the cap
      return uncapped(mlsPerKg) > capped();
    };

    const val = (mlsPerKg) => {
      // Returns the bolus volume to be used, selecting between capped or uncapped volume
      return isCapped(mlsPerKg) ? capped() : uncapped(mlsPerKg);
    };

    const formula = (mlsPerKg) => {
      return `[${mlsPerKg}mL/kg] x [Patient weight (kg)]`;
    };

    const limit = () => {
      return `${config.caps.bolus}mL`;
    };

    const working = (mlsPerKg) => {
      return `[${mlsPerKg}mL/kg] x [${data.weight.toFixed(1)}kg] = ${val(
        mlsPerKg
      ).toFixed(0)}mL`;
    };

    const bolusVolume = {
      val: val(config.bolusMlsPerKg),
      mlsPerKg: config.bolusMlsPerKg,
      isCapped: isCapped(config.bolusMlsPerKg),
      formula: formula(config.bolusMlsPerKg),
      limit: limit(),
      working: working(config.bolusMlsPerKg),
    };

    return bolusVolume;
  };

  const deficit = () => {
    const percentage = () => {
      const val = () => {
        // Returns the percentage dehydration based on pH
        if (severity() === "severe")
          return config.severity.severe.deficitPercentage;
        if (severity() === "moderate")
          return config.severity.moderate.deficitPercentage;
        if (severity() === "mild")
          return config.severity.mild.deficitPercentage;
        errors.push(
          `Unable to select deficit percentage using severity rating [${severity()}]`
        );
      };

      const formula = () => {
        // Returns the formula used to calculate deficit percentage
        return `[pH] in range ${config.severity.mild.pHRange.lower} to ${config.severity.mild.pHRange.upper} or [bicarbonate] <${config.severity.mild.bicarbonateBelow}mmol/L ==> ${config.severity.mild.deficitPercentage}%<br>
              [pH] in range ${config.severity.moderate.pHRange.lower} to ${config.severity.moderate.pHRange.upper} or [bicarbonate] <${config.severity.moderate.bicarbonateBelow}mmol/L ==> ${config.severity.moderate.deficitPercentage}%<br>
              [pH] in range ${config.severity.severe.pHRange.lower} to ${config.severity.severe.pHRange.upper} or [bicarbonate] <${config.severity.severe.bicarbonateBelow}mmol/L ==> ${config.severity.severe.deficitPercentage}%`;
      };

      const working = () => {
        // Returns the working formula and values for the deficit percentage calculation
        const getBicarbonateText = (bicarbonate) =>
          bicarbonate !== undefined
            ? `${bicarbonate.toFixed(1)} mmol/L`
            : "not provided";

        if (severity() === "severe") {
          return `[pH ${data.pH.toFixed(2)}] is in range ${
            config.severity.severe.pHRange.lower
          } to ${
            config.severity.severe.pHRange.upper
          } or [bicarbonate ${getBicarbonateText(data.bicarbonate)}] is <${
            config.severity.severe.bicarbonateBelow
          } mmol/L ==> ${config.severity.severe.deficitPercentage}%`;
        }
        if (severity() === "moderate") {
          return `[pH ${data.pH.toFixed(2)}] is in range ${
            config.severity.moderate.pHRange.lower
          } to ${
            config.severity.moderate.pHRange.upper
          } or [bicarbonate ${getBicarbonateText(data.bicarbonate)}] is <${
            config.severity.moderate.bicarbonateBelow
          } mmol/L ==> ${config.severity.moderate.deficitPercentage}%`;
        }
        if (severity() === "mild") {
          return `[pH ${data.pH.toFixed(2)}] is in range ${
            config.severity.mild.pHRange.lower
          } to ${
            config.severity.mild.pHRange.upper
          } or [bicarbonate ${getBicarbonateText(data.bicarbonate)}] is <${
            config.severity.severe.bicarbonateBelow
          } mmol/L ==> ${config.severity.mild.deficitPercentage}%`;
        }
      };
      const percentage = {
        val: val(),
        formula: formula(),
        working: working(),
      };
      return percentage;
    };

    const volume = () => {
      const uncapped = () => {
        // Returns literal deficit volume based on percentage dehydration and patient weight
        return percentage().val * data.weight * 10;
      };

      const capped = () => {
        // Returns the set limit of the bolus volume depending on dehydration percentage
        if (percentage().val === 5) return config.caps.deficit5;
        if (percentage().val === 10) return config.caps.deficit10;
        errors.push("Unable to select deficit.volumeCapped.");
      };

      const isCapped = () => {
        // Returns true if the uncapped deficit volume exceeds the cap
        return uncapped() > capped();
      };

      const val = () => {
        // Returns the deficit volume to be used, selecting between capped or uncapped volume
        if (isCapped()) return capped();
        return uncapped();
      };

      const formula = () => {
        // Returns the formula used to calculate deficit volume
        return "[Deficit percentage] x [Patient weight] x 10";
      };

      const limit = () => {
        // Returns the limit of the deficit volume
        if (percentage().val === 5)
          return `${config.caps.deficit5} mL (for 5% deficit)`;
        if (percentage().val === 10)
          return `${config.caps.deficit10} mL (for 10% deficit)`;
      };

      const working = () => {
        // Returns the working formula and values for the deficit volume calculation
        return `[${percentage().val}%] x [${data.weight.toFixed(
          1
        )} kg] x 10 = ${uncapped().toFixed(0)} mL ${
          isCapped() ? "(exceeds limit)" : ""
        }`;
      };

      const volume = {
        val: val(),
        formula: formula(),
        limit: limit(),
        working: working(),
        isCapped: isCapped(),
      };

      return volume;
    };

    const volumeLessBolus = () => {
      const bolusToSubtract = () => {
        // Returns a bolus volume to subtract, unless patient is shocked in which case boluses are not subtracted
        if (data.shockPresent) return 0;
        return bolusVolume(config.bolusMlsPerKg).val;
      };

      const val = () => {
        // Returns the deficit volume with bolus subtracted (if applicable)
        return volume().val - bolusToSubtract();
      };

      const formula = () => {
        // Returns the formula used to calculate deficit volume less bolus
        return "[Deficit volume] - [10mL/kg bolus (only for non-shocked patients)]";
      };

      const working = () => {
        // Returns the working formula and values for the deficit volume less bolus calculation
        return `[${volume().val.toFixed(0)}mL] - [${bolusToSubtract().toFixed(
          0
        )}mL] = ${val().toFixed(0)}mL`;
      };

      const volumeLessBolus = {
        bolusToSubtract: bolusToSubtract(),
        val: val(),
        formula: formula(),
        working: working(),
      };

      return volumeLessBolus;
    };

    const rate = () => {
      const val = () => {
        // Returns rate of deficit volume replacement to run over deficitReplacementDuration (mL/hour)
        return volumeToRate(
          volumeLessBolus().val,
          config.deficitReplacementDuration
        );
      };

      const formula = () => {
        // Returns the formula used to calculate the deficit rate
        return `[Deficit volume less bolus] ÷ [${config.deficitReplacementDuration} hours]`;
      };

      const working = () => {
        // Returns the working formula and values for the deficit rate calculation
        return `[${volumeLessBolus().val.toFixed(0)}mL] ÷ [${
          config.deficitReplacementDuration
        } hours] = ${val().toFixed(1)}mL/hour`;
      };

      const rate = {
        val: val(),
        formula: formula(),
        working: working(),
      };

      return rate;
    };

    const deficit = {
      percentage: percentage(),
      volume: volume(),
      volumeLessBolus: volumeLessBolus(),
      rate: rate(),
    };

    return deficit;
  };

  const maintenance = () => {
    const volume = () => {
      const uncapped = () => {
        // Returns the daily fluid requirement using the Holliday-Segar formula (mL)
        if (data.weight < 10) return data.weight * 100;
        if (data.weight < 20) return (data.weight - 10) * 50 + 1000;
        return (data.weight - 20) * 20 + 1500;
      };

      const capped = () => {
        // Returns the maintenance cap
        return config.caps.maintenance;
      };

      const isCapped = () => {
        // Returns true if the uncapped volume exceeds the cap
        return uncapped() > capped();
      };

      const val = () => {
        // Returns the maintenance volume to be used, selecting between capped or uncapped volume
        if (isCapped()) return capped();
        return uncapped();
      };

      const limit = () => {
        // Returns the maintenance volume limit
        return `${config.caps.maintenance}mL`;
      };

      const formula = () => {
        // Returns the formula used to calculate maintenance volume
        return "For [patient weight] ==> (100mL/kg for 0-10kg) + (50mL/kg for 10-20kg) + (20mL/kg for >20kg)";
      };

      const working = () => {
        // Returns the working formula and values for the maintenance volume calculation
        if (data.weight <= 10) {
          return `[${data.weight.toFixed(1)}kg] x 100mL = ${val().toFixed(
            0
          )}mL`;
        } else if (data.weight <= 20) {
          return `([10kg] x 100mL) + ([${(data.weight - 10).toFixed(
            1
          )}kg] x 50mL) = ${val().toFixed(0)}mL`;
        } else {
          return `([10kg] x 100mL) + ([10kg] x 50mL) + ([${(
            data.weight - 20
          ).toFixed(1)}kg] x 20mL) = ${val().toFixed(0)}mL`;
        }
      };

      const volume = {
        val: val(),
        isCapped: isCapped(),
        limit: limit(),
        formula: formula(),
        working: working(),
      };

      return volume;
    };
    const rate = () => {
      const val = () => {
        // Returns the maintenance fluid rate to run over 24 hours (mL/hour)
        return volumeToRate(volume().val, 24);
      };

      const formula = () => {
        // Returns the formula used to calculate the maintenance rate
        return "[Daily maintenance volume] ÷ 24 hours";
      };

      const working = () => {
        // Returns the working formula and values for the maintenance rate calculation
        return `[${volume().val.toFixed(0)}mL] ÷ 24 hours = ${val().toFixed(
          1
        )}mL/hour`;
      };

      const rate = {
        val: val(),
        formula: formula(),
        working: working(),
      };

      return rate;
    };

    const maintenance = {
      volume: volume(),
      rate: rate(),
    };
    return maintenance;
  };

  const startingFluidRate = () => {
    const val = () => {
      // Returns the starting fluid rate
      return deficit().rate.val + maintenance().rate.val;
    };

    const formula = () => {
      // Returns the formula used to calculate the starting fluid rate
      return "[Deficit replacement rate] + [Maintenance rate]";
    };

    const working = () => {
      // Returns the working formula and values for the starting fluid rate calculation
      return `[${deficit().rate.val.toFixed(
        1
      )}mL/hour] + [${maintenance().rate.val.toFixed(
        1
      )}mL/hour] = ${val().toFixed(1)}mL/hour`;
    };

    const startingFluidRate = {
      val: val(),
      formula: formula(),
      working: working(),
    };

    return startingFluidRate;
  };

  const insulinRate = () => {
    const uncapped = () => {
      // Returns the rate literal based on patient weight and selected insulin rate
      return data.insulinRate * data.weight;
    };

    const capped = () => {
      // Returns the capped insulin rate for selected insulin rate option
      if (data.insulinRate === 0.05) return config.caps.insulin005;
      if (data.insulinRate === 0.1) return config.caps.insulin01;
      errors.push(
        `Unable to select insulin rate capped using insulin rate [${data.insulinRate}].`
      );
    };

    const isCapped = () => {
      // Returns true if uncapped rate exceeds cap
      return uncapped() > capped();
    };

    const val = () => {
      // Returns the starting insulin rate (Units/hour), selecting between capped or uncapped rates
      return isCapped() ? capped() : uncapped();
    };

    const formula = () => {
      // Returns the formula used to calculate the insulin rate
      return "[Insulin rate (Units/kg/hour)] x [Patient weight]";
    };

    const limit = () => {
      // Returns the insulin rate limit based on the selected insulin rate option
      if (data.insulinRate === 0.05)
        return `${config.caps.insulin005} Units/hr`;
      if (data.insulinRate === 0.1) return `${config.caps.insulin01} Units/hr`;
      errors.push(
        `Unable to select insulin rate limit using insulin rate [${data.insulinRate}]`
      );
    };

    const working = () => {
      // Returns the working formula and values for the insulin rate calculation
      return `[${data.insulinRate} Units/kg/hour] x [${data.weight.toFixed(
        1
      )}kg] = ${val().toFixed(2)} Units/hour`;
    };

    const insulinRate = {
      val: val(),
      isCapped: isCapped(),
      formula: formula(),
      limit: limit(),
      working: working(),
    };

    return insulinRate;
  };

  const glucoseBolusVolume = () => {
    const uncapped = (mlsPerKg) => {
      // Returns literal glucose bolus volume based on given mL/kg for given patient weight
      return data.weight * mlsPerKg;
    };

    const capped = () => {
      // Returns the set limit of the glucose bolus volume
      return config.caps.glucoseBolus;
    };

    const isCapped = (mlsPerKg) => {
      // Returns true if the uncapped glucose bolus volume exceeds the cap
      return uncapped(mlsPerKg) > capped();
    };

    const val = (mlsPerKg) => {
      // Returns the glucose bolus volume to be used, selecting between capped or uncapped volume
      if (isCapped(mlsPerKg)) {
        return capped();
      } else {
        return uncapped(mlsPerKg);
      }
    };

    const formula = (mlsPerKg) => {
      // Returns the formula used to calculate the glucose bolus volume
      return `[${mlsPerKg}mL/kg] x [Patient weight (kg)]`;
    };

    const limit = () => {
      // Returns the glucose bolus volume limit
      return `${config.caps.glucoseBolus}mL`;
    };

    const working = (mlsPerKg) => {
      // Returns the working formula and values for the glucose bolus volume calculation
      return `[${mlsPerKg}mL/kg] x [${data.weight.toFixed(1)}kg] = ${val(
        mlsPerKg
      ).toFixed(0)}mL`;
    };

    const glucoseBolusVolume = {
      val: val(config.glucoseBolusMlsPerKg),
      mlsPerKg: config.glucoseBolusMlsPerKg,
      isCapped: isCapped(config.glucoseBolusMlsPerKg),
      formula: formula(config.glucoseBolusMlsPerKg),
      limit: limit(),
      working: working(config.glucoseBolusMlsPerKg),
    };

    return glucoseBolusVolume;
  };

  const hhsBolusVolume = () => {
    const uncapped = (mlsPerKg) => {
      // Returns literal HHS bolus volume based on given mL/kg for given patient weight
      return data.weight * mlsPerKg;
    };

    const capped = () => {
      // Returns the set limit of the HHS bolus volume
      return config.caps.hhsBolus;
    };

    const isCapped = (mlsPerKg) => {
      // Returns true if the uncapped HHS bolus volume exceeds the cap
      return uncapped(mlsPerKg) > capped();
    };

    const val = (mlsPerKg) => {
      // Returns the HHS bolus volume to be used, selecting between capped or uncapped volume
      return isCapped(mlsPerKg) ? capped() : uncapped(mlsPerKg);
    };

    const formula = (mlsPerKg) => {
      // Returns the formula used to calculate the HHS bolus volume
      return `[${mlsPerKg}mL/kg] x [Patient weight (kg)]`;
    };

    const limit = () => {
      // Returns the HHS bolus volume limit
      return `${config.caps.hhsBolus}mL`;
    };

    const working = (mlsPerKg) => {
      // Returns the working formula and values for the HHS bolus volume calculation
      return `[${mlsPerKg}mL/kg] x [${data.weight.toFixed(1)}kg] = ${val(
        mlsPerKg
      ).toFixed(0)}mL`;
    };

    const hhsBolusVolume = {
      val: val(config.hhsBolusMlsPerKg),
      mlsPerKg: config.hhsBolusMlsPerKg,
      isCapped: isCapped(config.hhsBolusMlsPerKg),
      formula: formula(config.hhsBolusMlsPerKg),
      limit: limit(),
      working: working(config.hhsBolusMlsPerKg),
    };

    return hhsBolusVolume;
  };

  const calculations = {
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

  return calculations;
};

module.exports = { performCalculations };
