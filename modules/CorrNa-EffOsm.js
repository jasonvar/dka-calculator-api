// Corrected Na Calculation 
function CorrectedNa() {
    const Na = data.Na; // data.Na contains patient sodium level in mmol/l
    const Gluc = data.Gluc; // data.Gluc contains patient glucose level in mmol/l
    const CorrectedNa = (Na.toFixed(1)) + ((Gluc.toFixed(1) - 5.6) / 3.5);
    return `${correctedNa.toFixed(1)} mmol/l`;
}

// Effective Osmolality Calculation 
function EffectiveOsmolality() {
    const Na = data.Na; // data.Na contains patient sodium level in mmol/l
    const Gluc = data.Gluc; // data.Gluc contains patient glucose level in mmol/l
    const EffectiveOsmolalty = (2*(Na.toFixed(1))) + (Gluc.toFixed(1));
    return `${effectiveOsmolality.toFixed(1)} mmol/l`;
}