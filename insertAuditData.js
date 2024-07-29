const mysql = require("mysql2/promise");
const keys = require("./private/keys.json");

/**
 * Inserts audit data into the database.
 * @param {Object} data - The submitted data to be inserted.
 * @param {string} imdDecile - IMD Decile value.
 * @param {string} auditID - Audit ID.
 * @param {string} patientHash - Patient hash.
 * @param {string} clientIP - Client IP address.
 * @param {Object} calculations - Output of calculateVariables.
 * @throws {Error} If an error occurs during the database operation.
 */
async function insertAuditData(
  data,
  imdDecile,
  auditID,
  patientHash,
  clientIP,
  calculations
) {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: keys.user,
      password: keys.password,
      database: "dkacalcu_dka_database",
    });

    // Prepare SQL statement
    const sql = `
      INSERT INTO tbl_data_v2 (
        legalAgreement, patientAge, patientSex, protocolStartDatetime, pH, bicarbonate, glucose, ketones, weight, weightLimitOverride,
        shockPresent, insulinRate, preExistingDiabetes, insulinDeliveryMethod, episodeType, region, centre, ethnicGroup, ethnicSubgroup,
        preventableFactors, imdDecile, auditID, patientHash, clientDatetime, clientUseragent, clientIP, appVersion, calculations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Execute SQL statement
    const [result] = await connection.execute(sql, [
      data.legalAgreement,
      data.patientAge,
      data.patientSex,
      data.protocolStartDatetime,
      data.pH,
      data.bicarbonate,
      data.glucose,
      data.ketones,
      data.weight,
      data.weightLimitOverride,
      data.shockPresent,
      data.insulinRate,
      data.preExistingDiabetes,
      data.insulinDeliveryMethod,
      data.episodeType,
      data.region,
      data.centre,
      data.ethnicGroup,
      data.ethnicSubgroup,
      data.preventableFactors,
      imdDecile,
      auditID,
      patientHash,
      data.clientDatetime,
      data.clientUseragent,
      clientIP,
      data.appVersion,
      calculations,
    ]);

    if (result.affectedRows === 0) {
      throw new Error("Audit data could not be logged: No rows affected");
    }
  } catch (error) {
    console.error(error);
    throw new Error(`Audit data could not be logged: ${error.message}`);
  } finally {
    try {
      await connection.end();
    } catch {
      //no connection to close
    }
  }
}

module.exports = {
  insertAuditData,
};
