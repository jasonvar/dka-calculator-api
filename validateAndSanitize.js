const { check, body, validationResult } = require("express-validator");
const config = require("./config.json");

const calculateRules = [
  check("legalAgreement")
    .isBoolean()
    .withMessage("Legal agreement field must be data type [boolean].")
    .bail() // Stop running validations if any of the previous ones have failed.
    .equals("true")
    .withMessage("You must agree to the legal disclaimer."),

  check("patientAge")
    .custom((value) => {
      //use custom validator as isFloat will accept numbers with string datatype
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("Patient age field must be data type [integer].");
      }
      return true;
    })
    .bail()
    .isInt({
      min: 0,
      max: 18,
    })
    .withMessage("Patient age must be an integer in the range 0 to 18."),

  check("patientSex")
    .isString()
    .withMessage("Patient sex field must be data type [string].")
    .bail()
    .custom((value) => ["male", "female"].includes(value))
    .withMessage("Patient sex must be male or female."),

  check("patientHash")
    .optional()
    .isAlphanumeric()
    .withMessage(
      "If provided, patient hash field must be data type [string], containing alphanumeric characters only."
    )
    .bail()
    .isLength({ min: 64, max: 64 })
    .withMessage(
      "If provided, patient hash field must be exactly 64 characters in length."
    ),

  check("patientPostcode")
    .optional()
    .isAlphanumeric()
    .withMessage(
      "Patient postcode field must be data type [string], containing alphanumeric characters only."
    )
    .bail()
    .matches(
      /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/
    )
    .withMessage("Patient postcode must be a valid UK postcode."),

  check("protocolStartDatetime")
    .isISO8601() // Validates the input as an ISO 8601 date
    .withMessage("Protocol start datetime must be ISO8601 date format.")
    .bail()
    .custom((value) => {
      const datetime = new Date(value);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (datetime < twentyFourHoursAgo || datetime > now) {
        throw new Error(
          "Protocol start datetime must be within the last 24 hours."
        );
      }

      return true;
    }),

  check("pH")
    .custom((value) => {
      //use custom validator as isFloat will accept numbers with string datatype
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("pH field must be data type [float].");
      }
      return true;
    })
    .bail()
    .isFloat({
      min: 6.5,
      max: 7.5,
    })
    .withMessage(`pH must be in range 6.5 to 7.5.`),

  check("bicarbonate")
    .optional()
    .custom((value) => {
      //use custom validator as isFloat will accept numbers with string datatype
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(
          "If provided, bicarbonate field must be data type [float]."
        );
      }
      return true;
    })
    .bail()
    .isFloat({
      min: 0,
      max: 35,
    })
    .withMessage("If provided, bicarbonate must be in range 0 to 35."),

  check("glucose")
    .optional()
    .custom((value) => {
      //use custom validator as isFloat will accept numbers with string datatype
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(
          "If provided, glucose field must be data type [float]."
        );
      }
      return true;
    })
    .bail()
    .isFloat({
      min: 3,
      max: 50,
    })
    .withMessage("If provided, glucose must be in range 3 to 50."),

  check("ketones")
    .optional()
    .custom((value) => {
      //use custom validator as isFloat will accept numbers with string datatype
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(
          "If provided, ketones field must be data type [float]."
        );
      }
      return true;
    })
    .bail()
    .isFloat({
      min: 0,
      max: 10,
    })
    .withMessage("If provided, ketones must be in range 3 to 50."),

  check("weight")
    .isFloat({ min: 2, max: 150 })
    .withMessage("Weight must be a valid number between 2 and 150."),

  check("weightLimitOverride")
    .isBoolean()
    .withMessage("Weight limit override field must be data type [boolean]."),

  check("shockPresent")
    .isBoolean()
    .withMessage("Clinical shock status field must be data type [boolean]."),

  check("insulinRate")
    .isFloat()
    .withMessage("Insulin rate field must be data type [float].")
    .bail()
    .custom((value) => [0.05, 0.1].includes(value))
    .withMessage("Insulin rate must be 0.05 or 0.1."),

  check("preExistingDiabetes")
    .isBoolean()
    .withMessage(
      "Pre-existing diabetes status field must be data type [boolean]."
    ),

  check("insulinDeliveryMethod")
    .if(body("preExistingDiabetes").equals("true"))
    .isAlpha()
    .withMessage(
      "Insulin delivery method field must be data type [string], containing only alpha characters."
    )
    .bail()
    .custom((value) => ["pen", "pump"].includes(value))
    .withMessage("Insulin delivery method must be pen or pump."),

  check("insulinDeliveryMethod")
    .if(body("preExistingDiabetes").equals("false"))
    .equals("")
    .withMessage(
      "Insulin delivery method must be blank if pre-existing diabetes status is false."
    ),

  check("episodeType")
    .isAlpha()
    .withMessage(
      "Episode type field must be data type [string], containing only alpha characters."
    )
    .bail()
    .custom((value) => ["real", "test"].includes(value))
    .withMessage("Episode type must be real or test."),

  check("region")
    .isString()
    .withMessage("Region field must be data type [string].")
    .escape(),

  check("centre")
    .isString()
    .withMessage("Treating centre field must be data type [string].")
    .escape(),

  check("ethnicGroup")
    .isString()
    .withMessage("Ethnic group field must be data type [string].")
    .escape(),

  check("ethnicSubgroup")
    .isString()
    .withMessage("Ethnic subgroup field must be data type [string].")
    .escape(),

  check("preventableFactors")
    .isArray()
    .withMessage("Preventable factors field must be data type [array].")
    .bail()
    .custom((array) =>
      array.every(
        (item) => typeof item === "string" && /^[a-zA-Z0-9]+$/.test(item)
      )
    )
    .withMessage(
      "Each preventable factor must be data type [string], containing alphanumeric characters only."
    ),

  check("appVersion")
    .isString()
    .withMessage("App version field must be data type [string].")
    .escape(),

  check("clientDatetime")
    .isISO8601() // Validates the input as an ISO 8601 date
    .withMessage("Client datetime must be ISO8601 date format."),

  check("clientUseragent")
    .isString()
    .withMessage("Client useragent field must be data type [string].")
    .escape(),
];

// Middleware function to validate the request
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { calculateRules, validateRequest };
