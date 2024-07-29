const mysql = require("mysql2/promise");
const keys = require("./private/keys.json");

const permittedChars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generates a unique audit ID.
 * @returns {Promise<string>} The unique audit ID.
 */
async function generateAuditID() {
  let auditID;
  let isUnique = false;
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: keys.user,
      password: keys.password,
      database: "dkacalcu_dka_database",
    });
    while (!isUnique) {
      auditID = generateRandomID(6, permittedChars);
      const [rows] = await connection.execute(
        "SELECT * FROM tbl_data_v2 WHERE auditID = ?",
        [auditID]
      );

      if (rows.length === 0) {
        isUnique = true;
      }
    }
  } catch (error) {
    throw new Error(
      `Unable to generate audit ID: ${error.message}${error.code}`
    );
  } finally {
    try {
      await connection.end();
    } catch {
      //no connection to close
    }
  }
  return auditID;
}

function generateRandomID(length, permittedChars) {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * permittedChars.length);
    result += permittedChars[randomIndex];
  }
  return result;
}

module.exports = { generateAuditID };
