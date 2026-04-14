import sys
import json
import os

# Top-50 locations kept during training; everything else maps to "other"
_KNOWN_LOCATIONS = {
    "adiala road", "airport housing society", "al rehman garden",
    "allama iqbal town", "askari", "bahria town", "bahria town karachi",
    "bahria town rawalpindi", "bani gala", "cantt", "chaklala scheme",
    "clifton", "d-12", "dha defence", "e-11", "eden gardens", "f-10",
    "f-11", "f-6", "f-7", "f-8", "federal b area", "g-10", "g-11",
    "g-13", "g-15", "gadap town", "ghauri town", "gulberg",
    "gulistan-e-jauhar", "gulraiz housing scheme", "gulshan-e-iqbal town",
    "i-10", "i-8", "jamshed town", "johar town", "korangi", "malir",
    "model town", "nazimabad", "north karachi", "north nazimabad",
    "pwd housing scheme", "samanabad", "satellite town", "satiana road",
    "scheme 33", "soan garden", "state life housing society", "wapda town",
}


def load_pickle(path):
    try:
        import joblib
        return joblib.load(path)
    except ImportError:
        import pickle
        with open(path, "rb") as f:
            return pickle.load(f)


def predict_market_value(input_data):
    import pandas as pd

    script_dir   = os.path.dirname(os.path.abspath(__file__))
    model_path   = os.path.join(script_dir, "zameen_rf_model.pkl")
    columns_path = os.path.join(script_dir, "model_columns.pkl")

    model   = load_pickle(model_path)
    columns = load_pickle(columns_path)

    # ── Parse inputs ────────────────────────────────────────────────────────
    area_sqft  = float(input_data.get("area_sqft", 1000))
    bedrooms   = int(input_data.get("bedrooms", 3))
    bathrooms  = int(input_data.get("bathrooms", 2))
    location   = str(input_data.get("location", "")).strip().lower()
    city       = str(input_data.get("city", "lahore")).strip().lower()
    prop_type  = str(input_data.get("property_type", "house")).strip().lower()
    purpose    = str(input_data.get("purpose", "for sale")).strip().lower()
    house_age  = int(input_data.get("house_age", 0))
    floors     = max(float(input_data.get("floors", 1)), 1)

    # Bucket unknown locations into "other" — mirrors training
    if location not in _KNOWN_LOCATIONS:
        location = "other"

    # ── Derived features (same as training pipeline) ────────────────────────
    area_marla     = area_sqft / 272.25
    beds_per_floor = bedrooms / floors
    baths_per_bed  = bathrooms / max(float(bedrooms), 1)

    if area_marla <= 5:
        area_category = "0-5 marla"
    elif area_marla <= 10:
        area_category = "5-10 marla"
    elif area_marla <= 20:
        area_category = "10-15 marla"
    else:
        area_category = "1-5 kanal"

    # ── Build feature row (all columns → 0, then fill known ones) ──────────
    row = {col: 0.0 for col in columns}

    numeric_map = {
        "baths":              bathrooms,
        "area":               area_sqft,
        "bedrooms":           bedrooms,
        "house_age":          house_age,
        "price_per_sqft":     0.0,          # unknown at inference time
        "bedrooms_per_floor": beds_per_floor,
        "baths_per_bedroom":  baths_per_bed,
        "Area Size":          area_marla,
    }
    for key, val in numeric_map.items():
        if key in row:
            row[key] = float(val)

    def set_ohe(prefix, value):
        col = f"{prefix}_{value}"
        if col in row:
            row[col] = 1.0

    set_ohe("location",      location)
    set_ohe("city",          city)
    set_ohe("property_type", prop_type)
    set_ohe("purpose",       purpose)
    set_ohe("Area Category", area_category)

    # ── Predict ─────────────────────────────────────────────────────────────
    df = pd.DataFrame([row], columns=columns)
    predicted_price = float(model.predict(df)[0])
    predicted_price = max(0.0, predicted_price)

    variance = 0.10
    return {
        "predictedMarketValue": round(predicted_price),
        "marketValueLow":       round(predicted_price * (1 - variance)),
        "marketValueHigh":      round(predicted_price * (1 + variance)),
        "pricePerSqft":         round(predicted_price / area_sqft) if area_sqft > 0 else 0,
        "modelInfo": {
            "model":        "Random Forest (Zameen.com · scikit-learn)",
            "features":     len(columns),
            "areaMarla":    round(area_marla, 2),
            "areaCategory": area_category,
        },
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    try:
        input_data = json.loads(sys.argv[1])
        result = predict_market_value(input_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
