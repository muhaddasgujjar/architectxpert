"""
Retrain the Zameen.com Random Forest model against the current scikit-learn version.
Run once:  python train_model.py
Overwrites zameen_rf_model.pkl and model_columns.pkl in the same folder.
"""

import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_percentage_error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH   = os.path.join(SCRIPT_DIR, "new_features_dataset.csv")

print("Loading dataset...")
df = pd.read_csv(CSV_PATH)
print(f"  Rows: {len(df)}")

# ── Target ───────────────────────────────────────────────────────────────────
target = "price"

# ── Numeric features ─────────────────────────────────────────────────────────
# price_per_sqft is excluded — it's derived from the target (data leakage)
# and cannot be known at prediction time.
numeric_cols = [
    "baths", "area", "bedrooms",
    "house_age",
    "bedrooms_per_floor", "baths_per_bedroom",
    "Area Size",
]

# ── Categorical features (one-hot encode) ─────────────────────────────────────
# Cap location to top-50 to avoid memory explosion (1543 unique values → ~800 MB OHE)
TOP_LOCATIONS = 50
top_locs = df["location"].value_counts().nlargest(TOP_LOCATIONS).index
df["location"] = df["location"].where(df["location"].isin(top_locs), other="other")

cat_cols = ["property_type", "location", "city", "purpose", "Area Category"]

print("Encoding categoricals...")
df_encoded = pd.get_dummies(df[cat_cols], prefix=cat_cols, dtype=float)

# ── Assemble feature matrix ───────────────────────────────────────────────────
X = pd.concat([df[numeric_cols].reset_index(drop=True),
               df_encoded.reset_index(drop=True)], axis=1)
y = df[target].values

print(f"  Feature matrix: {X.shape[0]} rows × {X.shape[1]} columns")

# ── Train / test split ────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.15, random_state=42
)

# ── Train Random Forest ───────────────────────────────────────────────────────
print("Training Random Forest (n_estimators=150, max_depth=20)...")
model = RandomForestRegressor(
    n_estimators=150,
    max_depth=20,
    min_samples_leaf=2,
    n_jobs=-1,
    random_state=42,
)
model.fit(X_train, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────────────
preds = model.predict(X_test)
mape  = mean_absolute_percentage_error(y_test, preds) * 100
print(f"  MAPE on test set: {mape:.2f}%")

# ── Save artefacts ────────────────────────────────────────────────────────────
model_path   = os.path.join(SCRIPT_DIR, "zameen_rf_model.pkl")
columns_path = os.path.join(SCRIPT_DIR, "model_columns.pkl")

joblib.dump(model,            model_path)
joblib.dump(list(X.columns),  columns_path)

print(f"\nSaved model   -> {model_path}")
print(f"Saved columns -> {columns_path}")
print("Done.")
