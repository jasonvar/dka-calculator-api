const { check, validationResult } = require("express-validator");

// Validation and sanitization function
const validateAndSanitizeData = async (data) => {
  const errors = [];

  // Validation rules
  await check("legalAgreement")
    .exists()
    .withMessage("Agreement to legal disclaimer is required.")
    .isBoolean()
    .withMessage("Agreement to legal disclaimer must be a boolean.")
    .run(data);

  await check("patientAge")
    .exists()
    .withMessage("Patient age is required.")
    .isInt()
    .withMessage("Patient age must be an integer.")
    .run(data);

  await check("patientSex")
    .exists()
    .withMessage("Patient sex is required.")
    .trim()
    .escape()
    .run(data);

  await check("patientHash").optional().trim().escape().run(data);

  await check("patientPostcode").optional().trim().escape().run(data);

  await check("protocolStartDatetime")
    .exists()
    .withMessage("Protocol start datetime is required.")
    .trim()
    .escape()
    .run(data);

  await check("pH")
    .exists()
    .withMessage("pH is required.")
    .isFloat()
    .withMessage("pH must be a float.")
    .run(data);

  await check("bicarbonate")
    .optional()
    .isFloat()
    .withMessage("Bicarbonate must be a float.")
    .run(data);

  await check("glucose")
    .optional()
    .isFloat()
    .withMessage("Glucose must be a float.")
    .run(data);

  await check("ketones")
    .optional()
    .isFloat()
    .withMessage("Ketones must be a float.")
    .run(data);

  await check("weight")
    .exists()
    .withMessage("Weight is required.")
    .isFloat()
    .withMessage("Weight must be a float.")
    .run(data);

  await check("shockPresent")
    .exists()
    .withMessage("Clinical shock status is required.")
    .isBoolean()
    .withMessage("Clinical shock status must be a boolean.")
    .run(data);

  await check("insulinRate")
    .exists()
    .withMessage("Insulin rate is required.")
    .isFloat()
    .withMessage("Insulin rate must be a float.")
    .run(data);

  await check("preExistingDiabetes")
    .exists()
    .withMessage("Pre-existing diabetes status is required.")
    .isBoolean()
    .withMessage("Pre-existing diabetes status must be a boolean.")
    .run(data);

  await check("insulinDeliveryMethod")
    .if(check("preExistingDiabetes").isBoolean().equals("true"))
    .exists()
    .withMessage("Insulin delivery method is required.")
    .trim()
    .escape()
    .run(data);

  await check("episodeType")
    .exists()
    .withMessage("Episode type is required.")
    .trim()
    .escape()
    .run(data);

  await check("region")
    .exists()
    .withMessage("Region is required.")
    .trim()
    .escape()
    .run(data);

  await check("centre")
    .exists()
    .withMessage("Centre is required.")
    .trim()
    .escape()
    .run(data);

  await check("ethnicGroup")
    .exists()
    .withMessage("Ethnic group is required.")
    .trim()
    .escape()
    .run(data);

  await check("ethnicSubgroup")
    .exists()
    .withMessage("Ethnic subgroup is required.")
    .trim()
    .escape()
    .run(data);

  await check("preventableFactors")
    .exists()
    .withMessage("Preventable factors selection is required.")
    .isArray({ min: 1 })
    .withMessage(
      "Preventable factors must be an array with at least one element."
    )
    .custom((value) => value.every((factor) => typeof factor === "string"))
    .withMessage("Each preventable factor must be a string.")
    .bail()
    .customSanitizer((value) => value.map((factor) => factor.trim()))
    .run(data);

  await check("weightLimitOverride")
    .exists()
    .withMessage("Weight limit override status is required.")
    .isBoolean()
    .withMessage("Weight limit override status must be a boolean.")
    .run(data);

  await check("appVersion")
    .exists()
    .withMessage("App version is required.")
    .trim()
    .escape()
    .run(data);

  await check("clientDatetime")
    .exists()
    .withMessage("Client datetime is required.")
    .trim()
    .escape()
    .run(data);

  await check("clientUseragent")
    .exists()
    .withMessage("Client useragent is required.")
    .trim()
    .escape()
    .run(data);

  const result = validationResult(data);
  if (!result.isEmpty()) {
    errors.push(...result.array().map((err) => err.msg));
    return { errors, isValid: false };
  }

  // Proceed with the sanitized and validated data
  data.legalAgreement = Boolean(data.legalAgreement);
  data.patientAge = parseInt(data.patientAge, 10);
  data.pH = parseFloat(data.pH);
  if (data.bicarbonate !== undefined)
    data.bicarbonate = parseFloat(data.bicarbonate);
  if (data.glucose !== undefined) data.glucose = parseFloat(data.glucose);
  if (data.ketones !== undefined) data.ketones = parseFloat(data.ketones);
  data.weight = parseFloat(data.weight);
  data.shockPresent = Boolean(data.shockPresent);
  data.insulinRate = parseFloat(data.insulinRate);
  data.preExistingDiabetes = Boolean(data.preExistingDiabetes);
  data.weightLimitOverride = Boolean(data.weightLimitOverride);

  const preventableFactorsJSON = JSON.stringify(data.preventableFactors);

  return { data, isValid: true };
};

module.exports = { validateAndSanitizeData };
