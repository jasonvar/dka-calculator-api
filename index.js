const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { matchedData } = require("express-validator");
const {
  validateRequest,
  updateRules,
  calculateRules,
  sodiumOsmoRules,
} = require("./modules/validateAndSanitize");
const keys = require("./private/keys.json");

const app = express();
app.use(cors());
app.use(bodyParser.json());

//required to get the client IP address as server behind proxy
app.set("trust proxy", 3);

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

app.get("/config", (req, res) => {
  const config = require("./config.json");
  res.json(config);
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
    const { calculateVariables } = require("./modules/calculateVariables");
    const { generateAuditID } = require("./modules/generateAuditID");
    const { insertCalculateData } = require("./modules/insertData");
    const { getImdDecile } = require("./modules/getImdDecile");
    const {
      checkWeightWithinLimit,
    } = require("./modules/checkWeightWithinLimit");

    //get the validated data
    const data = matchedData(req);

    //check the weight is within limits or override is true
    const check = checkWeightWithinLimit(data);
    if (!check.pass) {
      res.status(400).json({ errors: [{ msg: check.error }] });
      return;
    }

    //limit decimal age to 2 decimal places after checkWeighWithinLimit
    data.patientAge = data.patientAge.toFixed(2);

    //get the IP address of the client request
    const clientIP = req.ip;

    //perform the calculations and check for errors
    const calculations = calculateVariables(data);
    if (calculations.errors.length) {
      res.status(400).json({ errors: calculations.errors });
      return;
    }

    //set undefined optional values to null
    data.bicarbonate = data.bicarbonate || null;
    data.glucose = data.glucose || null;
    data.ketones = data.ketones || null;

    //perform the 2nd stage hashing with salt
    const patientHash = data.patientHash
      ? rehashPatientHash(data.patientHash)
      : null;

    //get the imdDecile from the postcode
    const imdDecile = data.patientPostcode
      ? await getImdDecile(data.patientPostcode)
      : null;

    //generate a new unique auditID
    const auditID = await generateAuditID();

    //insert the data into the database
    await insertCalculateData(
      data,
      imdDecile,
      auditID,
      patientHash,
      clientIP,
      calculations
    );

    //respond to the client with the auditID and the calculations
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
    const { updateData } = require("./modules/insertData");
    const { updateCheck } = require("./modules/updateCheck");

    //get the submitted data that passed validation
    const data = matchedData(req);

    //get the patientHash in the database for given audit ID to check correct patient
    const check = await updateCheck(data.auditID);

    //check the updateCheck found a record
    if (!check) {
      res.status(404).json(`Audit ID [${data.auditID}] not found in database`);
      const logEntry = `Failed update attempt (auditID not found) on auditID: ${
        data.auditID
      }, IP: ${req.ip}, Time: ${new Date().toISOString()}\n`;
      const fs = require("fs");
      fs.appendFileSync("./private/update_failed_attempts.txt", logEntry);
      return;
    }

    //check the episode has a patientHash
    if (!check.patientHash) {
      res
        .status(406)
        .json(
          `The episode matching the audit ID [${data.auditID}] was created without providing an NHS number. Retrospective audit data updates are therefore not accepted.`
        );
      return;
    }

    //perform the second step hash before checking patientHash matches
    const patientHash = rehashPatientHash(data.patientHash);

    //check the submitted patientHash matches the database patient hash
    if (check.patientHash != patientHash) {
      res
        .status(401)
        .json(
          `Patient NHS number or date of birth do not match for episode with audit ID: ${data.auditID}`
        );
      const logEntry = `Failed update attempt (Hash non-matching) on auditID: ${
        data.auditID
      }, IP: ${req.ip}, Time: ${new Date().toISOString()}\n`;
      const fs = require("fs");
      fs.appendFileSync("./private/update_failed_attempts.txt", logEntry);
      return;
    }

    //get the IP address of the client request
    const clientIP = req.ip;

    //update the database with new data
    await updateData(data, clientIP);

    res.json("Audit data update complete");
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

/**
 * Secondary route - for calculating corrected sodium and effective osmolality.
 * @name POST /update
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.post("/sodium-osmo", sodiumOsmoRules, validateRequest, async (req, res) => {
  try {
    const {
      calculateCorrectedSodium,
      calculateEffectiveOsmolality,
    } = require("./modules/sodiumOsmo");

    const data = matchedData(req);

    res.status(200).json({
      correctedSodium: calculateCorrectedSodium(data.sodium, data.glucose),
      effectiveOsmolality: calculateEffectiveOsmolality(
        data.sodium,
        data.glucose
      ),
    });
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
  res.status(400).json("Incorrect API route");
});

/**
 * Starts the server on port 3000.
 * @function
 */
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
