"""Train and persist the primary RandomForest model.

Stores model artefact at ml/load_model.pkl and writes a lightweight metadata
file that captures training metrics for viva/ops reference.
"""

import json
import os
import pickle
from datetime import datetime

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, "../data/cloud_load.csv")
MODEL_PATH = os.path.join(SCRIPT_DIR, "load_model.pkl")
METADATA_PATH = os.path.join(SCRIPT_DIR, "model_metadata.json")


def train():
	data = pd.read_csv(DATA_PATH)
	X = data[['time']]
	y = data['cpu_usage']

	X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

	model = RandomForestRegressor(n_estimators=200, random_state=42)
	model.fit(X_train, y_train)

	y_pred = model.predict(X_test)
	mse = mean_squared_error(y_test, y_pred)
	r2 = r2_score(y_test, y_pred)

	with open(MODEL_PATH, "wb") as f:
		pickle.dump(model, f)

	metadata = {
		"trained_at": datetime.utcnow().isoformat(),
		"data_rows": len(data),
		"features": ["time"],
		"model": "RandomForestRegressor",
		"hyperparameters": {"n_estimators": 200, "random_state": 42},
		"metrics": {"mse": mse, "r2_score": r2},
	}

	with open(METADATA_PATH, "w", encoding="utf-8") as f:
		json.dump(metadata, f, indent=2)

	print("Random Forest model trained successfully")
	print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
	train()
