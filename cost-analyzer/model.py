import sys
import json
import math
import os

def relu(x):
    return max(0.0, x)

def matmul_add_bias(input_arr, weights, bias):
    output = []
    for j in range(len(weights[0])):
        val = bias[j]
        for i in range(len(input_arr)):
            val += input_arr[i] * weights[i][j]
        output.append(val)
    return output

def predict(input_data, weights_data):
    features = [
        input_data.get('area', 1000),
        input_data.get('floors', 1),
        1 if input_data.get('quality') == 'standard' else 0,
        1 if input_data.get('quality') == 'premium' else 0,
        1 if input_data.get('quality') == 'luxury' else 0,
        input_data.get('bedrooms', 3),
        input_data.get('bathrooms', 2),
        1 if input_data.get('hasBasement') else 0,
        1 if input_data.get('hasGarage') else 0,
        input_data.get('locationTier', 2),
        input_data.get('area', 1000) * input_data.get('floors', 1),
        math.log(input_data.get('area', 1000) + 1)
    ]

    normalized = []
    for i, v in enumerate(features):
        std = weights_data['featureStds'][i] if i < len(weights_data['featureStds']) and weights_data['featureStds'][i] != 0 else 1.0
        normalized.append((v - weights_data['featureMeans'][i]) / std)

    h1 = [relu(x) for x in matmul_add_bias(normalized, weights_data['w1'], weights_data['b1'])]
    h2 = [relu(x) for x in matmul_add_bias(h1, weights_data['w2'], weights_data['b2'])]
    out = matmul_add_bias(h2, weights_data['w3'], weights_data['b3'])

    predicted_cost = out[0] * weights_data['targetStd'] + weights_data['targetMean']
    predicted_cost = max(0.0, predicted_cost)

    variance = 0.12
    confidence_low = round(predicted_cost * (1 - variance))
    confidence_high = round(predicted_cost * (1 + variance))

    quality = input_data.get('quality', 'standard')
    grey_pct = 0.38 if quality == 'luxury' else (0.42 if quality == 'premium' else 0.48)
    finish_pct = 0.32 if quality == 'luxury' else (0.28 if quality == 'premium' else 0.22)
    elec_pct = 0.10
    plumb_pct = 0.08
    fix_pct = 1 - grey_pct - finish_pct - elec_pct - plumb_pct

    result = {
        "predictedCost": round(predicted_cost),
        "costPerSqft": round(predicted_cost / (input_data.get('area', 1000) * input_data.get('floors', 1))),
        "confidenceLow": confidence_low,
        "confidenceHigh": confidence_high,
        "breakdown": {
            "greyStructure": round(predicted_cost * grey_pct),
            "finishing": round(predicted_cost * finish_pct),
            "electrical": round(predicted_cost * elec_pct),
            "plumbing": round(predicted_cost * plumb_pct),
            "fixtures": round(predicted_cost * fix_pct)
        },
        "modelInfo": {
            "architecture": "Neural Network (12->16->8->1) with ReLU activation (Python)",
            "trainingDataPoints": 2000,
            "features": [
                "area_sqft", "floors", "quality_standard", "quality_premium", "quality_luxury",
                "bedrooms", "bathrooms", "has_basement", "has_garage", "location_tier",
                "area_x_floors", "log_area"
            ]
        }
    }
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    try:
        input_data = json.loads(sys.argv[1])
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        weights_path = os.path.join(script_dir, 'weights.json')
        
        with open(weights_path, 'r') as f:
            weights_data = json.load(f)
            
        result = predict(input_data, weights_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
