const mysql = require("mysql2/promise");
const keys = require("./private/keys.json");

/**
 * Fetches the auditID and patientHash from the database.
 * @param {string} auditID - The audit ID to search for.
 * @returns {Promise<Object>} - The fetched data containing auditID and patientHash.
 */
async function updateCheck(auditID) {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: keys.user,
    password: keys.password,
    database: "dkacalcu_dka_database",
  });

  try {
    const sql =
      "SELECT auditID, patientHash FROM tbl_data_v2 WHERE auditID = ?";

    const [rows] = await connection.execute(sql, [auditID]);

    if (rows.length === 0) {
      throw new Error("Audit ID not found in database.");
    }

    return rows[0];
  } catch (error) {
    console.error(error);
    throw new Error(`Audit data could not be updated: ${error.message}`);
  } finally {
    try {
      await connection.end();
    } catch {
      //no connection to close
    }
  }
}

module.exports = {
  updateCheck,
};
