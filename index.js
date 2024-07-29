const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const mysql = require("mysql");
const { matchedData } = require("express-validator");
const { validateRequest, calculateRules } = require("./validateAndSanitize");
const keys = require("./private/keys.json");
const { calculateVariables } = require("./calculateVariables");
const { generateAuditID } = require("./generateAuditID");
const { insertAuditData } = require("./insertAuditData");
const { getImdDecile } = require("./getImdDecile");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send(
    "Please go to <a href='https://dka-calculator.co.uk/'>https://dka-calculator.co.uk</a> instead."
  );
});

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

    rehashPatientHash = (patientHash) =>
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

    await insertAuditData(
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

app.use("*", (req, res) => {
  res.json("Incorrect API route");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
