import pickle

model = pickle.load(open("load_model.pkl", "rb"))

future_time = [[11]]
prediction = model.predict(future_time)

print("Predicted CPU Load:", prediction[0])
