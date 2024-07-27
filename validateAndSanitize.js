const { check, validationResult } = require("express-validator");
const config = require("./config.json");

const validationRules = [
  check("legalAgreement")
    .isBoolean()
    .withMessage("Legal agreement field must be data type [boolean].")
    .equals("true")
    .withMessage("You must agree to the legal disclaimer."),

  check("patientSex")
    .isString()
    .withMessage("Patient sex field must be data type [string].")
    .custom((value) => ["male", "female"].includes(value))
    .withMessage("Patient sex must be male or female."),

  check("patientPostcode")
    .optional()
    .isString()
    .withMessage("Patient postcode field must be data type [string].")
    .matches(
      /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/
    )
    .withMessage("Patient postcode must be a valid UK postcode.")
    .escape(),

  check("pH")
    .custom((value) => {
      //use custom validator as isFloat will accept numbers with string datatype
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("pH field must be data type [float].");
      }
      return true;
    })
    .isFloat({
      min: config.severity.severe.pHRange.lower,
      max: config.severity.mild.pHRange.upper,
    })
    .withMessage(
      `pH must be in range ${config.severity.severe.pHRange.lower} to ${config.severity.mild.pHRange.upper}.`
    ),

  check("weight")
    .isFloat({ min: 2, max: 150 })
    .withMessage("Weight must be a valid number between 2 and 150."),
];

// Middleware function to validate the request
const validateRequest = (req, res, next) => {
  console.log(req.body.legalAgreement);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { validationRules, validateRequest };

/* Validation and sanitization function
const validateAndSanitize = async (data) => {
  const errors = [];
  let req = { body: data };
  // Validation rules
 

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

  await check("data.pH")
    .exists()
    .withMessage("pH is required.")
    .isFloat()
    .withMessage("pH must be a float.")
    .run(req);
  /*
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
  /*data.legalAgreement = Boolean(data.legalAgreement);
  data.patientAge = parseInt(data.patientAge, 10);
data.pH = parseFloat(data.pH);
/*if (data.bicarbonate !== undefined)
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
*/
