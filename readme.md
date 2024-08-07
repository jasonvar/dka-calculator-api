# BSPED Paediatric DKA Calculator API

A Express.js API calculating variables required for individualised versions of the **integrated care pathway for the management of children and young people under the age of 18 years with Diabetic Ketoacidosis** (2021) in line with [BSPED guidance](https://www.bsped.org.uk/clinical-resources/bsped-dka-guidelines/).

This API is designed to be used with BSPED Paediatric DKA Calculator Client, see repository <https://github.com/dan-leach/dka-calculator>.

The BSPED Paediatric DKA Calculator is registered as a medical device with the MHRA.

## API

The API is served from `https://api.dka-calculator.co.uk/`. The various functions of the API include validating and performing calculations on the input variables, generating unique episode IDs, inserting audit variables into the SQL database and returning the calculations and episode IDs to the client.

The API is tested with each update. The testing schema can be found in `tests.json`.

### API routes

#### /calculate

##### Request

Accepts a POST request with a single parameter `data` as a JSON encoded string with the following properties:

- **legalAgreement** boolean | required | accepted values: `true`
- **patientAge** integer | required | accepted values: `min: 0` `max: 18`
- **patientSex** string | required | accepted values: `male` or `female`
- **patientHash** string | optional | accepted values: `SHA-256 output hash`
- **patientPostcode** string | optional | accepted values: `any valid UK postcode`
- **protocolStartDatetime** datetime object | required | accepted values: `within last 24 hours`
- **pH** float | required | accepted values: `min: 6.5` `max: 7.5`
- **bicarbonate** float | optional | accepted values: `min: 0` `max: 35`
- **glucose** float | optional | accepted values: `min: 3` `max: 50`,
- **ketones** float | optional | accepted values: `min: 0` `max: 10`
- **weight** float | required | accepted values: `min: 2` `max: 150`
- **shockPresent** boolean | required | accepted values: `any`
- **insulinRate** float | required | accepted values: `0.05` or `0.1`
- **preExistingDiabetes** boolean | required | accepted values: `any`
- **insulinDeliveryMethod** string | required (if preExistingDiabetes is `true`) | accepted values: `pen` or `pump`
- **episodeType**: string | required | accepted values: `real` or `test`
- **region** string | required | accepted values: `any` (expected per list in dka-calculator/src/assets/config.js but not validated)
- **centre** string | required | accepted values: `any` (expected per list in dka-calculator/src/assets/config.js but not validated)
- **ethnicGroup** string | required | accepted values: `any` (expected per list in dka-calculator/src/assets/config.js but not validated)
- **ethnicSubgroup** string | required | accepted values: `any` (expected per list in dka-calculator/src/assets/config.js but not validated)
- **preventableFactors** array | required | accepted values: array of strings of minimum length 1 (expected contents of array per list in dka-calculator/src/assets/data.js but not validated)
- **weightLimitOverride** boolean | required | accepted values: `true` or `false`
- **appVersion** string | required | accepted values: `any` (expected per value in dka-calculator/src/assets/config.js but not validated)
- **clientDatetime** datetime object | required | accepted values: `any` (expected client device datetime generated at API call but not validated)
- **clientUseragent** string | required | accepted values: `any` (expected client navigator.userAgent but not validated)

#### Response

The API responds to valid requests with a JSON object with the following properties:

- **auditID** string | the unique episode ID to be printed on the generated care pathway and stored with the audit data
- **calculations** object:
  - **severity** string | `mild` or `moderate` or `severe`
  - **bolusVolume** object:
    - **val** number | the calculated value for bolus volume
    - **limit** string | the limit which the calculated value will never exceed
    - **isCapped** boolean | if the calculated value was capped by the limit
    - **formula** string | the forumla used to perform the calculation
    - **working** string | the formula with provided variables and output
  - **deficit** object:
    - **percentage** object:
      - **val** number | the calculated value for deficit percentage
      - **formula** string | the forumla used to perform the calculation
      - **working** string | the formula with provided variables and output
    - **volume** object:
      - **val** number | the calculated value for deficit volume
      - **limit** string | the limit which the calculated value will never exceed
      - **isCapped** boolean | if the calculated value was capped by the limit
      - **formula** string | the forumla used to perform the calculation
      - **working** string | the formula with provided variables and output
    - **volumeLessBolus** object:
      - **bolusToSubtract** number | the bolus volume to be subtracted from deficit volume to give deficit volume less bolus
      - **val** number | the calculated value for deficit volume less bolus
      - **formula** string | the forumla used to perform the calculation
      - **working** string | the formula with provided variables and output
    - **rate** object:
      - **val** number | the calculated value for deficit rate
      - **formula** string | the forumla used to perform the calculation
      - **working** string | the formula with provided variables and output
  - **maintenance** object:
    - **volume** object:
      - **val** number | the calculated value for maintenance volume
      - **limit** string | the limit which the calculated value will never exceed
      - **isCapped** boolean | if the calculated value was capped by the limit
      - **formula** string | the forumla used to perform the calculation
      - **working** string | the formula with provided variables and output
    - **rate** object:
      - **val** number | the calculated value for maintenance rate
      - **formula** string | the forumla used to perform the calculation
      - **working** string | the formula with provided variables and output
  - **startingFluidRate** object:
    - **val** number | the calculated value for starting fluid rate
    - **formula** string | the forumla used to perform the calculation
    - **working** string | the formula with provided variables and output
  - **insulinRate** object:
    - **val** number | the calculated value for insulin rate
    - **limit** string | the limit which the calculated value will never exceed
    - **isCapped** boolean | if the calculated value was capped by the limit
    - **formula** string | the forumla used to perform the calculation
    - **working** string | the formula with provided variables and output
  - **glucoseBolusVolume** object:
    - **val** number | the calculated value for glucose bolus volume
    - **mlsPerKg** number | the mls per kg patient body weight used to calculate the glucose bolus volume
    - **limit** string | the limit which the calculated value will never exceed
    - **isCapped** boolean | if the calculated value was capped by the limit
    - **formula** string | the forumla used to perform the calculation
    - **working** string | the formula with provided variables and output
- **hhsBolusVolume** object:
  - **val** number | the calculated value for HHS bolus volume
  - **mlsPerKg** number | the mls per kg patient body weight used to calculate the HHS bolus volume
  - **limit** string | the limit which the calculated value will never exceed
  - **isCapped** boolean | if the calculated value was capped by the limit
  - **formula** string | the forumla used to perform the calculation
  - **working** string | the formula with provided variables and output

If the call is invalid a JSON object is returned with an array of errors.

#### /update

##### Request

Accepts a POST request with a single parameter `data` as a JSON encoded string with the following properties:

- **auditID** string | required | accepted values: `alphanumeric of length 6`
- **patientHash** string | required | accepted values: `SHA-256 output hash`
- **preExistingDiabetes** boolean | required | accepted values: `any`
- **preventableFactors** array | required | accepted values: array of strings of minimum length 1 (expected contents of array per list in dka-calculator/src/assets/data.js but not validated)

##### Response

The API responds to valid requests with a string: `Audit data update complete`

If the call is invalid a JSON object is returned with an array of errors.
