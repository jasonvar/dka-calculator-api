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
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send(
    "Please go to <a href='https://dka-calculator.co.uk/'>https://dka-calculator.co.uk</a> instead."
  );
});

function test(res) {
  res.send("test send");
}

app.post("/", async (req, res) => {
  try {
    if (!req.body.data) {
      sendErrorResponse("No data received.", 400, res);
    }
    const data = JSON.parse(req.body.data);
    data.pH = "fail";
    console.log(1, "pH:", data.pH);
    const validation = validateAndSanitizeData(data);
    console.log(2, "validation:", await validation);
    res.json(validation);
    console.log(3);
    return;

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
