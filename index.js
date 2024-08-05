const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { matchedData } = require("express-validator");
const {
  validateRequest,
  updateRules,
  calculateRules,
} = require("./validateAndSanitize");
const keys = require("./private/keys.json");
const { calculateVariables } = require("./calculateVariables");
const { generateAuditID } = require("./generateAuditID");
const { insertCalculateData, updateData } = require("./insertData");
const { getImdDecile } = require("./getImdDecile");
const { updateCheck } = require("./updateCheck");

const app = express();
app.use(cors());
app.use(bodyParser.json());

/**
 * Any browser GET requests redirects to the main website.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.get("/", (req, res) => {
  res.send(
    "Please go to <a href='https://dka-calculator.co.uk/'>https://dka-calculator.co.uk</a> instead."
  );
});

/**
 * Primary route - for calculating variables and entering new episodes into the database.
 * @name POST /calculate
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.post("/calculate", calculateRules, validateRequest, async (req, res) => {
  try {
    const data = matchedData(req);

    const clientIP = req.ip;

    const calculations = calculateVariables(data);
    if (calculations.errors.length) {
      res.status(400).json({ errors: calculations.errors });
      return;
    }

    data.bicarbonate = data.bicarbonate || null;
    data.glucose = data.glucose || null;
    data.ketones = data.ketones || null;

    /**
     * Rehashes the patient hash with salt.
     * @param {string} patientHash - The original patient hash.
     * @returns {string} - The rehashed patient hash.
     */
    const rehashPatientHash = (patientHash) =>
      crypto
        .createHash("sha256")
        .update(patientHash + keys.salt)
        .digest("hex");

    const patientHash = data.patientHash
      ? rehashPatientHash(data.patientHash)
      : null;

    const imdDecile = data.patientPostcode
      ? await getImdDecile(data.patientPostcode)
      : null;

    const auditID = await generateAuditID();

    await insertCalculateData(
      data,
      imdDecile,
      auditID,
      patientHash,
      clientIP,
      calculations
    );

    res.json({
      auditID,
      calculations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

/**
 * Secondary route - for updating preventableFactors data.
 * @name POST /update
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.post("/update", updateRules, validateRequest, async (req, res) => {
  try {
    const data = matchedData(req);

    const check = updateCheck(data.auditID);

    if (check.patientHash != data.patientHash) {
      res
        .status(401)
        .json(
          `Patient NHS number or date of birth do not match for episode with audit ID: ${data.auditID}`
        );
    }

    await updateData(data);

    res.json("Audit data updated successfully");
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

/**
 * Default route for handling incorrect API routes.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.use("*", (req, res) => {
  res.json("Incorrect API route");
});

/**
 * Starts the server on port 3000.
 * @function
 */
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
