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

# Rough PKR/sq ft resale anchors (urban Pakistan, 2024–25) — used when RF artefacts are absent
_CITY_PPSF_PKR = {
    "lahore": 12500,
    "karachi": 11500,
    "islamabad": 20000,
    "rawalpindi": 10500,
    "faisalabad": 7800,
    "multan": 8500,
    "peshawar": 9200,
    "quetta": 6500,
    "abbottabad": 8800,
    "gujranwala": 7200,
    "hyderabad": 6800,
    "sialkot": 9800,
    "bahawalpur": 6200,
}


def load_pickle(path):
    try:
        import joblib
        return joblib.load(path)
    except ImportError:
        import pickle
        with open(path, "rb") as f:
            return pickle.load(f)


def _area_category(area_marla: float) -> str:
    if area_marla <= 5:
        return "0-5 marla"
    if area_marla <= 10:
        return "5-10 marla"
    if area_marla <= 20:
        return "10-15 marla"
    return "1-5 kanal"


def _clean_msg(msg):
    if not msg:
        return None
    s = " ".join(str(msg).split())
    return s[:220] + ("…" if len(s) > 220 else "")


def _predict_heuristic(input_data, fallback_reason=None):
    """Offline resale estimate when RF model files or sklearn stack are unavailable."""
    area_sqft = float(input_data.get("area_sqft", 1000))
    bedrooms = int(input_data.get("bedrooms", 3))
    bathrooms = int(input_data.get("bathrooms", 2))
    floors = max(float(input_data.get("floors", 1)), 1)
    city = str(input_data.get("city", "lahore")).strip().lower()
    prop_type = str(input_data.get("property_type", "house")).strip().lower()
    purpose = str(input_data.get("purpose", "for sale")).strip().lower()
    house_age = int(input_data.get("house_age", 0))

    ppsf = _CITY_PPSF_PKR.get(city, 9500)
    area_marla = area_sqft / 272.25
    acat = _area_category(area_marla)

    # Adjustments (same spirit as feature engineering, without OHE)
    bed_adj = 1.0 + 0.025 * (bedrooms - 3)
    bath_adj = 1.0 + 0.015 * (bathrooms - 2)
    floor_adj = 1.0 + 0.045 * (floors - 1)
    age_adj = max(0.72, 1.0 - min(house_age, 45) * 0.007)
    if "apartment" in prop_type or "flat" in prop_type:
        type_adj = 0.90
    elif "plot" in prop_type or "land" in prop_type:
        type_adj = 0.55
    else:
        type_adj = 1.0
    # Rental listings: show indicative asset value (not monthly rent)
    purpose_adj = 0.88 if "rent" in purpose else 1.0

    predicted_price = (
        area_sqft
        * ppsf
        * bed_adj
        * bath_adj
        * floor_adj
        * age_adj
        * type_adj
        * purpose_adj
    )
    predicted_price = max(0.0, float(predicted_price))

    variance = 0.10
    note = "Heuristic fallback (PK urban resale anchors)"
    cr = _clean_msg(fallback_reason)
    if cr:
        note += f" — RF unavailable: {cr}"

    return {
        "predictedMarketValue": round(predicted_price),
        "marketValueLow": round(predicted_price * (1 - variance)),
        "marketValueHigh": round(predicted_price * (1 + variance)),
        "pricePerSqft": round(predicted_price / area_sqft) if area_sqft > 0 else 0,
        "modelInfo": {
            "model": note,
            "features": 0,
            "areaMarla": round(area_marla, 2),
            "areaCategory": acat,
        },
    }


def _predict_rf(input_data):
    import pandas as pd

    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "zameen_rf_model.pkl")
    columns_path = os.path.join(script_dir, "model_columns.pkl")

    model = load_pickle(model_path)
    columns = load_pickle(columns_path)

    area_sqft = float(input_data.get("area_sqft", 1000))
    bedrooms = int(input_data.get("bedrooms", 3))
    bathrooms = int(input_data.get("bathrooms", 2))
    location = str(input_data.get("location", "")).strip().lower()
    city = str(input_data.get("city", "lahore")).strip().lower()
    prop_type = str(input_data.get("property_type", "house")).strip().lower()
    purpose = str(input_data.get("purpose", "for sale")).strip().lower()
    house_age = int(input_data.get("house_age", 0))
    floors = max(float(input_data.get("floors", 1)), 1)

    if location not in _KNOWN_LOCATIONS:
        location = "other"

    area_marla = area_sqft / 272.25
    beds_per_floor = bedrooms / floors
    baths_per_bed = bathrooms / max(float(bedrooms), 1)

    if area_marla <= 5:
        area_category = "0-5 marla"
    elif area_marla <= 10:
        area_category = "5-10 marla"
    elif area_marla <= 20:
        area_category = "10-15 marla"
    else:
        area_category = "1-5 kanal"

    row = {col: 0.0 for col in columns}

    numeric_map = {
        "baths": bathrooms,
        "area": area_sqft,
        "bedrooms": bedrooms,
        "house_age": house_age,
        "price_per_sqft": 0.0,
        "bedrooms_per_floor": beds_per_floor,
        "baths_per_bedroom": baths_per_bed,
        "Area Size": area_marla,
    }
    for key, val in numeric_map.items():
        if key in row:
            row[key] = float(val)

    def set_ohe(prefix, value):
        col = f"{prefix}_{value}"
        if col in row:
            row[col] = 1.0

    set_ohe("location", location)
    set_ohe("city", city)
    set_ohe("property_type", prop_type)
    set_ohe("purpose", purpose)
    set_ohe("Area Category", area_category)

    df = pd.DataFrame([row], columns=columns)
    predicted_price = float(model.predict(df)[0])
    predicted_price = max(0.0, predicted_price)

    variance = 0.10
    return {
        "predictedMarketValue": round(predicted_price),
        "marketValueLow": round(predicted_price * (1 - variance)),
        "marketValueHigh": round(predicted_price * (1 + variance)),
        "pricePerSqft": round(predicted_price / area_sqft) if area_sqft > 0 else 0,
        "modelInfo": {
            "model": "Random Forest (Zameen.com · scikit-learn)",
            "features": len(columns),
            "areaMarla": round(area_marla, 2),
            "areaCategory": area_category,
        },
    }


def predict_market_value(input_data):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "zameen_rf_model.pkl")
    columns_path = os.path.join(script_dir, "model_columns.pkl")

    if not (os.path.isfile(model_path) and os.path.isfile(columns_path)):
        return _predict_heuristic(
            input_data,
            fallback_reason="Add zameen_rf_model.pkl and model_columns.pkl (run `python train_model.py` with new_features_dataset.csv) to enable RF",
        )

    try:
        return _predict_rf(input_data)
    except Exception as e:
        msg = str(e)
        low = msg.lower()
        if "pickle" in low or "unpickle" in low or "incompatible" in low or "dtype" in low:
            msg = (
                "Saved RF model does not match this scikit-learn version. "
                "Remove zameen_rf_model.pkl and model_columns.pkl or run `python train_model.py` to regenerate."
            )
        return _predict_heuristic(input_data, fallback_reason=msg)


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
