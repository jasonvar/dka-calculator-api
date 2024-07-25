const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const mysql = require("mysql");
const { handleError, sendErrorResponse } = require("./errorHandlers");
const { validateAndSanitizeData } = require("./validateAndSanitizeData");
//const { keys } = require("./private/keys");
//const { performCalculations } = require("./calculations");
//const { generateAuditID } = require("./generateAuditID");
//const { databaseInsert } = require("./databaseInsert");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("This API does not accept GET requests");
});

app.post("/", async (req, res) => {
  res.send(
    "This is where I've got to - this message is received and displayed in the error message of the generateProtocol screen."
  );
  return; //without a later error causes the express app to crash
  try {
    if (!req.body.data) {
      return sendErrorResponse(res, "No data received.", 400);
    }

    const data = req.body.data;
    validateAndSanitizeData(data);

    let patientHash;
    if (data.patientHash) {
      patientHash = crypto
        .createHash("sha256")
        .update(data.patientHash + keys.salt)
        .digest("hex");
    }

    const clientIP = req.ip;

    const calculations = performCalculations(data);

    const connection = mysql.createConnection({
      host: "localhost",
      user: keys.username,
      password: keys.password,
      database: "dkacalcu_dka_database",
    });

    connection.connect();

    const auditID = await generateAuditID(connection);

    await databaseInsert(connection, auditID, data, calculations, clientIP);

    connection.end();

    res.json({
      auditID: auditID,
      calculations: calculations,
    });
  } catch (error) {
    handleError(error, res);
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
