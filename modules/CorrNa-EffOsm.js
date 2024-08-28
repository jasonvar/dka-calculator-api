// Exporting the functions
module.exports = { CorrectedSodium, EffectiveOsmolality };

// Corrected Sodium Calculation 
function CorrectedSodium(data) {
    return (data.Sodium + ((data.Glucose - 5.6) / 3.5));
}

// Effective Osmolality Calculation
function EffectiveOsmolality(data) {
    return (2 * data.Sodium + data.Glucose);
}